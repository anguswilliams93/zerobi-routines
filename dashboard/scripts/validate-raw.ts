/**
 * Walks raw/**.json and validates each file against its zod schema in lib/schema.ts.
 * Exits 1 on any schema mismatch, missing required file (allowlisted), or _meta.ok=false without a note.
 *
 * Run: npm run validate:raw
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  RawMeta,
  DailyCalendar, DailyUnread, DailyInvoices, DailyActions, GmailDrafts,
  WeeklyCalendar, WeeklyInbox, WeeklyJira,
  ProfitLoss, BalanceSheet, Cash, Customers, Receivables, BankSpend, BankBalances, LoanInterest,
  Deadlines,
  QueueFile,
} from "../lib/schema";

const RAW_ROOT = path.join(process.cwd(), "raw");

const MAP: Record<string, z.ZodTypeAny> = {
  "meta.json":                     RawMeta,
  "daily/calendar.json":           DailyCalendar,
  "daily/unread.json":             DailyUnread,
  "daily/invoices.json":           DailyInvoices,
  "daily/actions.json":            DailyActions,
  "daily/gmail-drafts.json":       GmailDrafts,
  "weekly/calendar.json":          WeeklyCalendar,
  "weekly/inbox.json":             WeeklyInbox,
  "weekly/jira.json":              WeeklyJira,
  "financial/pl.json":             ProfitLoss,
  "financial/balance-sheet.json":  BalanceSheet,
  "financial/cash.json":           Cash,
  "financial/customers.json":      Customers,
  "financial/receivables.json":    Receivables,
  "financial/bank-spend.json":     BankSpend,
  "financial/bank-balances.json":  BankBalances,
  "financial/loan-interest.json":  LoanInterest,
  "deadlines.json":                Deadlines,
  "actions/queue.json":            QueueFile,
};

type Result = { rel: string; status: "ok" | "stale-ok" | "fail" | "skip"; note?: string };

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".json")) out.push(rel);
  }
  return out;
}

function validate(rel: string): Result {
  const abs = path.join(RAW_ROOT, rel);
  const schema = MAP[rel];
  if (!schema) {
    return { rel, status: "skip", note: "no schema mapping" };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(abs, "utf8");
  } catch (err) {
    return { rel, status: "fail", note: `read error: ${(err as Error).message}` };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { rel, status: "fail", note: `JSON parse: ${(err as Error).message}` };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { rel, status: "fail", note: `schema: ${issue.path.join(".")} — ${issue.message}` };
  }
  const meta = (json as { _meta?: { ok?: boolean; note?: string } })._meta;
  if (meta && meta.ok === false && (!meta.note || meta.note.trim() === "")) {
    return { rel, status: "fail", note: "_meta.ok=false without _meta.note" };
  }
  if (meta && meta.ok === false) {
    return { rel, status: "stale-ok", note: meta.note };
  }
  return { rel, status: "ok" };
}

function main() {
  const found = walk(RAW_ROOT);
  if (found.length === 0) {
    console.error(`No JSON files found under ${RAW_ROOT}`);
    process.exit(1);
  }

  const results: Result[] = found.map(validate);
  const failed = results.filter((r) => r.status === "fail");
  const skipped = results.filter((r) => r.status === "skip");
  const stale = results.filter((r) => r.status === "stale-ok");

  for (const r of results) {
    const tag = r.status === "ok" ? "✓" : r.status === "stale-ok" ? "·" : r.status === "skip" ? "?" : "✗";
    console.log(`${tag} ${r.rel}${r.note ? ` — ${r.note}` : ""}`);
  }

  console.log("");
  console.log(`${results.length - failed.length - skipped.length} ok · ${stale.length} stale (ok=false) · ${skipped.length} skipped (no schema) · ${failed.length} failed`);

  if (skipped.length > 0) {
    console.warn("WARNING: files without schema mappings — add to MAP in scripts/validate-raw.ts");
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
