import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { WeeklyCalendar } from "@/lib/schema";
import { fmtTime, fmtWeekday } from "@/lib/format";

export function WeekCalendar({ res }: { res: ReadResult<WeeklyCalendar> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Calendar" caption="next 7d" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.events.length === 0 ? (
          <EmptyPanel reason="no events this week" />
        ) : (
          <ul className="px-[18px]">
            {res.data.events.map((e, i) => (
              <li key={e.id ?? i} className="item">
                <div className="item-time">
                  <span className="day">{fmtWeekday(e.start).toUpperCase()}</span>
                  <span>{e.all_day ? "ALL" : fmtTime(e.start)}</span>
                </div>
                <div className="item-body">
                  <div className="item-title">{e.title}</div>
                  {e.location && <div className="item-meta">{e.location}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ZbCardBody>
    </ZbCard>
  );
}
