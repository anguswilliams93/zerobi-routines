import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { DailyUnread } from "@/lib/schema";

export function Unread({ res }: { res: ReadResult<DailyUnread> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Unread inbox" caption="today · −promotions −social" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.emails.length === 0 ? (
          <EmptyPanel reason="inbox zero" />
        ) : (
          <ul className="px-[18px]">
            {res.data.emails.map((m, i) => (
              <li key={m.id ?? i} className="item">
                <div className="item-body">
                  <div className="item-title">
                    {m.action_required && <span className="tag todo">REPLY</span>}
                    {m.subject}
                  </div>
                  <div className="item-meta">
                    {m.sender} · {m.gist}
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
