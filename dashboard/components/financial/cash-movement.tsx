import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { BankSpend as BankSpendType } from "@/lib/schema";
import { AUD } from "@/lib/format";

export function CashMovement({ res }: { res: ReadResult<BankSpendType> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Cash movement" caption="in / out / net" />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <>
            <Row label="In" value={res.data.total_in} tone="signal" />
            <Row label="Out" value={-res.data.total_out} tone={res.data.total_out > 0 ? "danger" : "default"} />
            <Row label="Net" value={res.data.net} bold tone={res.data.net >= 0 ? "signal" : "danger"} />
          </>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}

function Row({
  label,
  value,
  tone = "default",
  bold,
}: {
  label: string;
  value: number;
  tone?: "default" | "signal" | "danger";
  bold?: boolean;
}) {
  const toneCls = tone === "signal" ? "text-[var(--signal-dim)]" : tone === "danger" ? "text-[var(--danger)]" : "text-[var(--ink)]";
  return (
    <div className={`flex justify-between py-2.5 ${bold ? "border-t border-[var(--line-2)] mt-1.5 pt-3" : "border-b border-[var(--line)]"}`}>
      <span className={`text-[12px] ${bold ? "uppercase tracking-wider font-medium" : "text-[var(--ink-2)]"}`}>{label}</span>
      <span className={`mono text-[13px] font-medium ${toneCls}`}>{AUD(value)}</span>
    </div>
  );
}
