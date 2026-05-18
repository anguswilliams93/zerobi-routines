import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { Customers } from "@/lib/schema";
import { pctRaw } from "@/lib/format";

export function PsiPanel({ res }: { res: ReadResult<Customers> }) {
  const failed = !res.stale && res.data.psi_failed;
  return (
    <ZbCard
      style={{
        borderColor: failed ? "var(--danger-line)" : "var(--line)",
        background: failed
          ? "linear-gradient(135deg, var(--danger-dim) 0%, var(--surface) 75%)"
          : "var(--surface)",
      }}
    >
      <ZbCardHead title="PSI 80:20 test" caption="FY26" />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : (
          <>
            <span className={`pill ${res.data.psi_failed ? "bad" : "live"} mb-3 inline-block`}>
              {res.data.psi_failed ? "Failed" : "Pass"}
            </span>
            <div
              className="serif tnum leading-none"
              style={{
                fontSize: 52,
                color: res.data.psi_failed ? "var(--danger)" : "var(--signal-dim)",
                letterSpacing: "-0.02em",
              }}
            >
              {pctRaw(res.data.psi_total_pct, 1)}
              <span className="text-[var(--ink-3)] text-[18px] font-normal ml-2 font-sans">≥ 80%</span>
            </div>
            <p className="text-[12.5px] text-[var(--ink-2)] leading-relaxed mt-3">
              Sales-Contracting (Perigon) breaches the 80% threshold. Profit attributed personally for FY26.
            </p>
            <div className="mt-3 p-3 rounded-lg text-[11.5px] text-[var(--ink-2)] leading-relaxed bg-[var(--bg-2)]">
              <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider uppercase mb-1">Next milestone</div>
              PCG 2025/5 takes effect 30 Jun 2027. Trust distributions stop saving you.
            </div>
          </>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
