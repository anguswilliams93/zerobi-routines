#!/usr/bin/env node
/**
 * Lint prompts/*.md for structural typos in MCP tool names and obvious style violations.
 * Exits 1 on any finding. Designed to be conservative — only flags issues that would
 * actually break a routine run, not stylistic preferences about canonical naming.
 *
 * Run: node scripts/lint-prompts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "..", "prompts");

// Pick up every plausible MCP-style identifier on a line; the actual typo check
// runs as a function (regex is too clumsy for "missing second __ separator").
const MCP_CANDIDATE = /\bmcp[_-][A-Za-z0-9_-]+/g;

function mcpFinding(tool) {
  // Typo 1: mcp followed by a single underscore (or hyphen) instead of `mcp__`.
  if (!tool.startsWith("mcp__")) {
    return `expected prefix "mcp__", got "${tool.slice(0, 5)}"`;
  }
  // Typo 2: triple underscore right after mcp.
  if (tool.startsWith("mcp___")) {
    return "triple underscore after mcp";
  }
  // Typo 3: server-vs-tool separator missing. After the leading `mcp__`,
  // there must be at least one more `__` (or `-` for hyphen-style names like
  // `shadcn-studio-mcp`). Otherwise the runtime can't split server / tool.
  const rest = tool.slice(5);
  if (!rest.includes("__") && !rest.includes("-")) {
    return "missing second separator (expected mcp__server__tool)";
  }
  return null;
}

// Banned phrases in user-facing copy. Skip lines that are themselves listing the banned phrases.
const BANNED_PHRASES = [/\b(Sure|Of course|Happy to|I'?d be happy)\b/i];
const SKIP_LINE_IF = [/\bno\s+["']/i, /forbidden/i, /banned/i, /avoid/i];

const findings = [];

function lintFile(absPath, rel) {
  const text = fs.readFileSync(absPath, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    MCP_CANDIDATE.lastIndex = 0;
    for (const m of line.matchAll(MCP_CANDIDATE)) {
      const why = mcpFinding(m[0]);
      if (why) findings.push({ file: rel, line: lineNo, kind: "mcp-typo", value: m[0], why });
    }

    if (SKIP_LINE_IF.some((re) => re.test(line))) return;
    for (const re of BANNED_PHRASES) {
      const m = line.match(re);
      if (m) findings.push({ file: rel, line: lineNo, kind: "banned-phrase", value: m[0] });
    }
  });

  // Daily-routine writer contract: the routine must never write actions/queue.json.
  if (rel === "daily-routine.md") {
    lines.forEach((line, idx) => {
      if (
        /dashboard\/raw\/actions\/queue\.json/.test(line) &&
        /\b(write|writeFileSync|overwrite|append|fs\.write|echo\s+>.*queue|>\s*.*queue)\b/i.test(line)
      ) {
        findings.push({
          file: rel,
          line: idx + 1,
          kind: "queue-write-from-routine",
          value: line.trim().slice(0, 100),
        });
      }
    });
  }
}

function main() {
  if (!fs.existsSync(PROMPTS_DIR)) {
    console.error(`No prompts dir at ${PROMPTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md"));
  for (const f of files) lintFile(path.join(PROMPTS_DIR, f), f);

  if (findings.length === 0) {
    console.log(`✓ ${files.length} prompt files clean`);
    return;
  }

  for (const f of findings) {
    console.log(`✗ prompts/${f.file}:${f.line} [${f.kind}] ${f.value}${f.why ? ` — ${f.why}` : ""}`);
  }
  console.log(`\n${findings.length} findings across ${new Set(findings.map((f) => f.file)).size} files`);
  process.exit(1);
}

main();
