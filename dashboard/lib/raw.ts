import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";

const RAW_ROOT = path.join(process.cwd(), "raw");

export type ReadResult<T> = { data: T; stale: false } | { data: null; stale: true; reason: string };

/** Read + validate a JSON file under raw/. Returns stale + reason if missing/invalid. */
export function readRaw<S extends z.ZodTypeAny>(relPath: string, schema: S): ReadResult<z.infer<S>> {
  const abs = path.join(RAW_ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return { data: null, stale: true, reason: "no data — run /scheduler" };
  }
  try {
    const raw = fs.readFileSync(abs, "utf8");
    const json = JSON.parse(raw);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return { data: null, stale: true, reason: `schema error: ${parsed.error.issues[0]?.message ?? "invalid"}` };
    }
    return { data: parsed.data, stale: false };
  } catch (err) {
    return { data: null, stale: true, reason: err instanceof Error ? err.message : "read error" };
  }
}

export function rawRoot() {
  return RAW_ROOT;
}
