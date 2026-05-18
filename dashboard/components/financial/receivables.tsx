import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { Receivables as ARType, QueueEntry } from "@/lib/schema";
import { AUD } from "@/lib/format";
import { ReceivableRow } from "@/components/financial/receivables-row";

export function Receivables({ res, queue = [] }: { res: ReadResult<ARType>; queue?: QueueEntry[] }) {
  const pendingByContact = new Set(
    queue
      .filter((e) => e.status === "pending" && e.action.type === "xero_add_note")
      .map((e) => (e.action.type === "xero_add_note" ? e.action.contact : "")),
  );
  return (
    <ZbCard>
      <ZbCardHead title="Outstanding invoices" caption={res.stale ? "no data" : `live · ${AUD(res.data.total)} total`} />
      <ZbCardBody>
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.items.length === 0 ? (
          <EmptyPanel reason="no outstanding AR" />
        ) : (
          <ul>
            {res.data.items.map((r, i) => (
              <ReceivableRow
                key={i}
                contact={r.contact}
                amount={r.amount}
                due_date={r.due_date}
                days_overdue={r.days_overdue}
                hasPending={pendingByContact.has(r.contact)}
              />
            ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
