import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { Deadlines } from "@/lib/schema";
import { daysUntil, deadlineSeverity, fmtDate, AUD } from "@/lib/format";

export function DeadlineGrid({ res }: { res: ReadResult<Deadlines> }) {
  if (res.stale) {
    return (
      <ZbCard>
        <ZbCardHead title="Deadlines" />
        <ZbCardBody><EmptyPanel reason={res.reason} /></ZbCardBody>
      </ZbCard>
    );
  }
  return (
    <div className="deadline-grid">
      {res.data.items.map((d, i) => {
        const days = daysUntil(d.date);
        const sev = deadlineSeverity(days);
        return (
          <div key={i} className={`deadline ${sev === "normal" ? "" : sev}`}>
            <div className="deadline-countdown">
              {Math.abs(days)}
              <span className="unit">{days < 0 ? "d overdue" : days === 0 ? "today" : "d"}</span>
            </div>
            <div className="deadline-label">{d.label}</div>
            <div className="deadline-date">{fmtDate(d.date)}{d.amount != null && <> · {AUD(d.amount)}</>}</div>
            {d.note && <div className="deadline-note">{d.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
