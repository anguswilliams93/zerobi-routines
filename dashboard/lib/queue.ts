import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { QueueFile, type QueueEntry, type QueueAction } from "@/lib/schema";

const QUEUE_PATH = path.join(process.cwd(), "raw", "actions", "queue.json");

function ensureDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readQueue(): QueueEntry[] {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    const parsed = QueueFile.safeParse(JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8")));
    return parsed.success ? parsed.data.entries : [];
  } catch {
    return [];
  }
}

export function enqueue(action: QueueAction): QueueEntry {
  ensureDir();
  const existing = readQueue();
  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: "pending",
    action,
  };
  const next = QueueFile.parse({ entries: [...existing, entry] });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(next, null, 2), "utf8");
  return entry;
}

export function pendingFor(predicate: (a: QueueAction) => boolean): QueueEntry[] {
  return readQueue().filter((e) => e.status === "pending" && predicate(e.action));
}
