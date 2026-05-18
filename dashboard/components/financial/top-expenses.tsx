import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { ProfitLoss } from "@/lib/schema";
import { AUD } from "@/lib/format";

export function TopExpenses({ res }: { res: ReadResult<ProfitLoss> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Top expenses" caption={res.stale ? "no data" : `${res.data.period} YTD`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <ul>
            {res.data.top_expenses.map((e, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-3 items-center py-2 border-b border-[var(--line)] last:border-0">
                <span className="text-[12px] text-[var(--ink-2)] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--info-dim)] border-l-2 border-[var(--info)]" />
                  {e.name}
                </span>
                <span className="mono text-[12px] text-[var(--ink)]">{AUD(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
