import { ZbCard, ZbCardHead, ZbCardBody } from "@/components/zb-card";

export function BlockscoreLedger({ shareholderLoan = 60240 }: { shareholderLoan?: number }) {
  return (
    <ZbCard>
      <ZbCardHead title="BlockScore — co-founder ledger" caption="factual log" />
      <ZbCardBody>
        <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider uppercase mb-3">Status</div>
        <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
          Funding outgoings personally for ~3 months. No co-founder capital contributed yet.
          Thompson Partners advise wait for ~$12,500 startup capital before forming the new co.
        </p>
        <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider uppercase mt-4 mb-1.5">Shareholder loan to Zerobi</div>
        <div className="flex justify-between py-1.5">
          <span className="text-[12px] text-[var(--ink-2)]">Loan — Angus Williams (live)</span>
          <span className="mono text-[13px] font-medium text-[var(--ink)]">
            ${shareholderLoan.toLocaleString("en-AU")}
          </span>
        </div>
        <div className="mono text-[10px] text-[var(--ink-3)] tracking-wider uppercase mt-3 mb-1.5">Fix path</div>
        <p className="text-[12px] text-[var(--ink-2)] leading-relaxed">
          $82K franked dividend clears the ~$60K shareholder loan and the ~$18K deferred tax in one motion.
        </p>
      </ZbCardBody>
    </ZbCard>
  );
}
