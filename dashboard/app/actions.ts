"use server";

import { revalidatePath } from "next/cache";
import { enqueue } from "@/lib/queue";

export async function queueXeroNote(input: {
  invoice_id?: string;
  contact: string;
  amount?: number;
  note: string;
}) {
  if (!input.note.trim()) return { ok: false as const, error: "note empty" };
  const entry = enqueue({ type: "xero_add_note", ...input });
  revalidatePath("/");
  return { ok: true as const, id: entry.id };
}

export async function queueGmailEdit(input: {
  draft_id: string;
  to: string;
  subject: string;
  body: string;
}) {
  const entry = enqueue({ type: "gmail_update_draft", ...input });
  revalidatePath("/");
  return { ok: true as const, id: entry.id };
}

export async function queueGmailLabel(input: {
  draft_id: string;
  message_id?: string;
  label: string;
}) {
  const entry = enqueue({ type: "gmail_label", ...input });
  revalidatePath("/");
  return { ok: true as const, id: entry.id };
}

export async function queueGmailDiscard(draft_id: string) {
  const entry = enqueue({ type: "gmail_discard", draft_id });
  revalidatePath("/");
  return { ok: true as const, id: entry.id };
}
