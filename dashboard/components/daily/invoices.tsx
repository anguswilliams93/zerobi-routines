import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { DailyInvoices } from "@/lib/schema";
import { AUD, fmtDate } from "@/lib/format";

export function Invoices({ res }: { res: ReadResult<DailyInvoices> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Invoice inbox" caption="today · cross-checked vs budget" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.invoices.length === 0 ? (
          <EmptyPanel reason="no invoices today" />
        ) : (
          <ul className="px-[18px]">
            {res.data.invoices.map((inv, i) => (
              <li key={i} className="item">
                <div className="item-body">
                  <div className="item-title">
                    {!inv.in_budget && <span className="tag blocked">MISSING</span>}
                    {inv.in_budget && <span className="tag done">MATCHED</span>}
                    {inv.vendor} — {AUD(inv.amount_aud)}
                  </div>
                  <div className="item-meta">
                    {inv.due_date && <>due {fmtDate(inv.due_date)} · </>}
                    {inv.invoice_no && <>#{inv.invoice_no} · </>}
                    {inv.budget_match_note ?? ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
