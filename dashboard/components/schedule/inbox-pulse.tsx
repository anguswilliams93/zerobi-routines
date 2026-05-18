import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { WeeklyInbox } from "@/lib/schema";

export function InboxPulse({ res }: { res: ReadResult<WeeklyInbox> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Inbox" caption="last 7d" />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <>
            <div className="flex justify-between items-baseline mb-3">
              <span className="mono text-[10px] text-[var(--ink-3)] tracking-wider">RECEIVED</span>
              <span className="mono text-[20px] font-semibold">{res.data.total_received}</span>
            </div>
            {res.data.top_senders.length > 0 && (
              <>
                <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider mb-2 mt-4">TOP SENDERS</div>
                <ul>
                  {res.data.top_senders.slice(0, 5).map((s, i) => (
                    <li key={i} className="flex justify-between py-1.5 text-[12px] border-b border-[var(--line)] last:border-0">
                      <span className="text-[var(--ink-2)]">{s.sender}</span>
                      <span className="mono">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {res.data.threads_needing_reply.length > 0 && (
              <>
                <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider mb-2 mt-4">NEEDS REPLY</div>
                <ul>
                  {res.data.threads_needing_reply.slice(0, 5).map((t, i) => (
                    <li key={i} className="py-1.5 text-[12px] border-b border-[var(--line)] last:border-0">
                      <div className="font-medium truncate">{t.subject}</div>
                      <div className="mono text-[10px] text-[var(--ink-3)]">{t.sender} · {t.age_days}d</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
