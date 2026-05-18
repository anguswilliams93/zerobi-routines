"use client";

import { useState, useTransition } from "react";
import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { GmailDrafts, GmailDraft, QueueEntry } from "@/lib/schema";
import { fmtDate } from "@/lib/format";
import { queueGmailEdit, queueGmailLabel, queueGmailDiscard } from "@/app/actions";

const READY_LABEL = "ready-to-send";

export function GmailDraftsPanel({ res, queue = [] }: { res: ReadResult<GmailDrafts>; queue?: QueueEntry[] }) {
  const pendingIds = new Set(
    queue
      .filter((e) => e.status === "pending" && e.action.type !== "xero_add_note")
      .map((e) => (e.action.type === "xero_add_note" ? "" : e.action.draft_id)),
  );
  return (
    <ZbCard>
      <ZbCardHead title="Gmail drafts" caption={res.stale ? "no data" : `${res.data.drafts.length} draft${res.data.drafts.length === 1 ? "" : "s"}`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.drafts.length === 0 ? (
          <EmptyPanel reason="no drafts" />
        ) : (
          <ul>
            {res.data.drafts.map((d) => (
              <DraftRow key={d.id} draft={d} hasPending={pendingIds.has(d.id)} />
            ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}

function DraftRow({ draft, hasPending }: { draft: GmailDraft; hasPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(draft.body);
  const [queued, setQueued] = useState(hasPending);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await queueGmailEdit({ draft_id: draft.id, to: draft.to, subject: draft.subject, body });
      if (res.ok) { setQueued(true); setOpen(false); }
    });
  }
  function markReady() {
    startTransition(async () => {
      const res = await queueGmailLabel({ draft_id: draft.id, message_id: draft.message_id, label: READY_LABEL });
      if (res.ok) setQueued(true);
    });
  }
  function discard() {
    if (!confirm(`Discard draft to ${draft.to}?`)) return;
    startTransition(async () => {
      const res = await queueGmailDiscard(draft.id);
      if (res.ok) setQueued(true);
    });
  }

  return (
    <li className="py-2.5 border-b border-[var(--line)] last:border-0">
      <div className="flex justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{draft.subject || "(no subject)"}</div>
          <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5 truncate">
            to {draft.to || "?"}
            {draft.updated_at && <> · {fmtDate(draft.updated_at)}</>}
            {queued && <span className="text-[var(--ink-4)] ml-2">· action queued</span>}
          </div>
          {!open && draft.snippet && (
            <div className="text-[11px] text-[var(--ink-3)] mt-1 line-clamp-2">{draft.snippet}</div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mono text-[10px] text-[var(--ink-4)] hover:text-[var(--ink)] border border-[var(--line)] px-2 py-0.5 rounded"
          >
            {open ? "cancel" : "edit"}
          </button>
          <button
            type="button"
            onClick={markReady}
            disabled={pending}
            className="mono text-[10px] text-[var(--ink-4)] hover:text-[var(--ink)] border border-[var(--line)] px-2 py-0.5 rounded disabled:opacity-40"
          >
            ready
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={pending}
            className="mono text-[10px] text-[var(--danger)] hover:opacity-80 border border-[var(--line)] px-2 py-0.5 rounded disabled:opacity-40"
          >
            discard
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full mono text-[11px] bg-transparent border border-[var(--line)] px-2 py-1 rounded text-[var(--ink)]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="mono text-[10px] text-[var(--ink)] border border-[var(--ink)] px-2 py-1 rounded disabled:opacity-40"
            >
              {pending ? "..." : "queue save"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
