import { ZbCard, ZbCardHead, ZbCardBody } from "@/components/zb-card";

export function TaxObligations() {
  return (
    <ZbCard>
      <ZbCardHead title="Tax obligations" caption="FY26 · pending" />
      <ZbCardBody>
        <TaxRow
          label="ATO Income Tax"
          sub="due 15 May 2026 · pay from offset @ 6.5%"
          value="$18,473"
          tone="danger"
        />
        <TaxRow
          label="GST / PAYG / Super payable"
          sub="rolled into current liabilities · see BS"
          value="~$5,050"
          tone="warning"
        />
        <TaxRow
          label="BAS Q4 FY26"
          sub="due 28 Jul 2026 · GST + PAYG instalment"
          value="pending"
          tone="muted"
        />
        <TaxRow
          label="$82K franked dividend"
          sub="declare before 30 Jun 2026 → KHI → Bianca"
          value="$82,000"
          tone="signal"
          accent
        />
      </ZbCardBody>
    </ZbCard>
  );
}

function TaxRow({
  label,
  sub,
  value,
  tone,
  accent,
}: {
  label: string;
  sub: string;
  value: string;
  tone: "danger" | "warning" | "signal" | "muted";
  accent?: boolean;
}) {
  const valColor = {
    danger: "text-[var(--danger)]",
    warning: "text-[var(--warning)]",
    signal: "text-[var(--signal-dim)]",
    muted: "text-[var(--ink-4)]",
  }[tone];
  return (
    <div className={`flex justify-between py-3 ${accent ? "border-t border-[var(--line-2)] mt-2 pt-4" : "border-b border-[var(--line)]"}`}>
      <div>
        <strong className={accent ? "text-[var(--signal-dim)]" : "text-[var(--ink)]"}>{label}</strong>
        <div className="mono text-[10px] text-[var(--ink-3)] mt-0.5">{sub}</div>
      </div>
      <div className={`mono text-[13px] font-medium ${valColor}`}>{value}</div>
    </div>
  );
}
