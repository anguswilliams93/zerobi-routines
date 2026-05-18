import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { Customers } from "@/lib/schema";
import { AUD, pctRaw } from "@/lib/format";

export function RevenueBars({ res }: { res: ReadResult<Customers> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Revenue by customer" caption={res.stale ? "no data" : `${res.data.fy} YTD · live`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <ul>
            {res.data.customers.map((c, i) => {
              const isOver80 = c.pct >= 80;
              return (
                <li key={i} className="py-[14px] border-b border-[var(--line)] last:border-0">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[13px] font-medium">
                      {c.name}
                      {c.tag && <span className="mono text-[var(--ink-4)] text-[11px] ml-2">{c.tag}</span>}
                    </span>
                    <span className={`mono text-[16px] font-semibold ${isOver80 ? "text-[var(--danger)]" : "text-[var(--signal-dim)]"}`}>
                      {pctRaw(c.pct, 1)} <span className="text-[var(--ink-4)] text-[11px]">· {AUD(c.amount)}</span>
                    </span>
                  </div>
                  <div className={`bar relative ${isOver80 ? "alert" : ""}`}>
                    <span style={{ width: `${Math.min(c.pct, 100)}%` }} />
                    <div className="bar-threshold" data-label="80%" style={{ left: "80%" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
