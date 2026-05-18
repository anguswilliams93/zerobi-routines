import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { BalanceSheet as BSType } from "@/lib/schema";
import { AUD, fmtDate } from "@/lib/format";

const TONE_CLASS: Record<string, string> = {
  default: "text-[var(--ink)]",
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  signal: "text-[var(--signal-dim)]",
};

export function BalanceSheet({ res }: { res: ReadResult<BSType> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Balance sheet" caption={res.stale ? "no data" : `as at ${fmtDate(res.data.as_at)}`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <ul>
            {res.data.rows.map((r, i) => {
              const isTotal = r.section === "total";
              return (
                <li
                  key={i}
                  className={`flex justify-between items-baseline py-[10px] border-b border-[var(--line)] last:border-0 ${
                    isTotal ? "uppercase tracking-wider text-[11px] font-medium border-t border-t-[var(--line-2)] pt-3 mt-1.5" : ""
                  }`}
                >
                  <span className="text-[12px] text-[var(--ink-2)]">
                    {r.label}
                    {r.sub && <span className="mono text-[10px] text-[var(--ink-4)] ml-1.5">{r.sub}</span>}
                  </span>
                  <span className={`mono text-[13px] font-medium ${TONE_CLASS[r.tone]}`}>{AUD(r.value)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
