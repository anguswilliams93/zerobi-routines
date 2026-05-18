import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { Cash } from "@/lib/schema";
import { AUD } from "@/lib/format";

export function WorkingCapital({ res }: { res: ReadResult<Cash> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Working capital" caption="cash + AR − AP" />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <>
            <Row label="Cash at bank" value={res.data.cash_at_bank} />
            <Row label="Receivables" value={res.data.receivables} />
            <Row label="Payables" value={-res.data.payables} />
            <Row label="Working capital" value={res.data.working_capital} bold />
          </>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2.5 ${bold ? "border-t border-[var(--line-2)] mt-1.5 pt-3" : "border-b border-[var(--line)]"}`}>
      <span className={`text-[12px] ${bold ? "uppercase tracking-wider font-medium" : "text-[var(--ink-2)]"}`}>{label}</span>
      <span className={`mono text-[13px] font-medium ${bold ? "text-[var(--signal-dim)]" : value < 0 ? "text-[var(--danger)]" : ""}`}>
        {AUD(value)}
      </span>
    </div>
  );
}
