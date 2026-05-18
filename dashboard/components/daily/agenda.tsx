import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { DailyCalendar } from "@/lib/schema";
import { fmtTime } from "@/lib/format";

export function Agenda({ res }: { res: ReadResult<DailyCalendar> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Today's agenda" caption="calendar · today" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.events.length === 0 ? (
          <EmptyPanel reason="no events today" />
        ) : (
          <ul className="px-[18px]">
            {res.data.events.map((e, i) => (
              <li key={e.id ?? i} className="item">
                <div className="item-time">
                  {e.all_day ? <span className="day">ALL</span> : <span className="day">{fmtTime(e.start)}</span>}
                  {!e.all_day && e.end && <span>{fmtTime(e.end)}</span>}
                </div>
                <div className="item-body">
                  <div className="item-title">{e.title}</div>
                  <div className="item-meta">
                    {e.location && <span className="mr-2">{e.location}</span>}
                    {e.attendees.length > 0 && <span>· {e.attendees.length} attendees</span>}
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
