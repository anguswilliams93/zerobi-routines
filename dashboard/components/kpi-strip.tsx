import type { ProfitLoss, Cash, Customers } from "@/lib/schema";
import { AUD, pctRaw } from "@/lib/format";
import { CountUp } from "@/components/count-up";

export function KpiStrip({
  pl,
  cash,
  customers,
}: {
  pl: ProfitLoss | null;
  cash: Cash | null;
  customers: Customers | null;
}) {
  const psiPct = customers?.psi_total_pct;
  const psiFailed = customers?.psi_failed ?? false;
  const cashStatus = cash?.status ?? "healthy";

  return (
    <div className="kpi-grid">
      <Kpi
        label="YTD Revenue"
        value={pl?.revenue_ytd ?? null}
        prefix="$"
        delta={pl ? `${pl.period} · 1 Jul → today` : "no data"}
      />
      <Kpi
        label="YTD Net Profit"
        value={pl?.net_profit_ytd ?? null}
        prefix="$"
        tone={pl && pl.net_margin_pct < 12 ? "warning" : undefined}
        delta={pl ? `${pctRaw(pl.net_margin_pct)} margin` : "no data"}
      />
      <Kpi
        label="Cash at Bank"
        value={cash?.cash_at_bank ?? null}
        prefix="$"
        tone={cashStatus === "critical" || cashStatus === "tight" ? "danger" : undefined}
        delta={cash ? `+ ${AUD(cash.receivables)} AR` : "no data"}
      />
      <Kpi
        label="PSI 80:20"
        value={psiPct ?? null}
        suffix="%"
        decimals={1}
        tone={psiFailed ? "danger" : "signal"}
        delta={psiFailed ? "Contracting ≥ 80%" : "Under 80%"}
        deltaTone={psiFailed ? "down" : "up"}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  delta,
  tone,
  deltaTone,
}: {
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta?: string;
  tone?: "danger" | "warning" | "signal";
  deltaTone?: "up" | "down";
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value tnum ${tone ?? ""}`}>
        {value == null ? "—" : (
          <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        )}
      </div>
      {delta && <div className={`kpi-delta ${deltaTone ?? ""}`}>{delta}</div>}
    </div>
  );
}
