"use client";

import { useState, useTransition } from "react";
import { AUD, fmtDate } from "@/lib/format";
import { queueXeroNote } from "@/app/actions";

type Props = {
  contact: string;
  amount: number;
  due_date?: string;
  days_overdue: number;
  invoice_id?: string;
  hasPending: boolean;
};

export function ReceivableRow({ contact, amount, due_date, days_overdue, invoice_id, hasPending }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [queued, setQueued] = useState(hasPending);
  const [pending, startTransition] = useTransition();
  const overdue = days_overdue > 0;

  function submit() {
    if (!note.trim()) return;
    startTransition(async () => {
      const res = await queueXeroNote({ invoice_id, contact, amount, note });
      if (res.ok) {
        setQueued(true);
        setOpen(false);
        setNote("");
      }
    });
  }

  return (
    <li className="py-2.5 border-b border-[var(--line)] last:border-0">
      <div className="flex justify-between">
        <div>
          <div className="text-[13px] font-medium">{contact}</div>
          <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5">
            {due_date && <>due {fmtDate(due_date)}</>}
            {overdue && <span className="text-[var(--danger)] ml-2">· {days_overdue}d overdue</span>}
            {queued && <span className="text-[var(--ink-4)] ml-2">· note queued</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`mono text-[13px] font-medium ${overdue ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
            {AUD(amount)}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mono text-[10px] text-[var(--ink-4)] hover:text-[var(--ink)] border border-[var(--line)] px-2 py-0.5 rounded"
            aria-expanded={open}
          >
            {open ? "cancel" : "+ note"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. emailed accounts 12 May, expects payment Friday"
            className="flex-1 mono text-[11px] bg-transparent border border-[var(--line)] px-2 py-1 rounded text-[var(--ink)]"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoFocus
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={submit}
            className="mono text-[10px] text-[var(--ink)] border border-[var(--ink)] px-2 py-1 rounded disabled:opacity-40"
          >
            {pending ? "..." : "queue"}
          </button>
        </div>
      )}
    </li>
  );
}
