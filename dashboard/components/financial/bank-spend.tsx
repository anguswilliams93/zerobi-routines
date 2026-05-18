import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { BankSpend as BankSpendType } from "@/lib/schema";
import { AUD } from "@/lib/format";

export function BankSpend({ res }: { res: ReadResult<BankSpendType> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Bank spend by category" caption={res.stale ? "no data" : `last ${res.data.window_days}d · ex-transfers`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <ul>
            {res.data.by_category
              .slice()
              .sort((a, b) => b.amount - a.amount)
              .map((c, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] gap-3 items-center py-2 border-b border-[var(--line)] last:border-0">
                  <span className="text-[12px] text-[var(--ink-2)] flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-[var(--info-dim)] border-l-2 border-[var(--info)]" />
                    {c.label}
                  </span>
                  <span className="mono text-[12px] text-[var(--ink)]">{AUD(c.amount)}</span>
                </li>
              ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
