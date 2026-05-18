import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { DailyActions } from "@/lib/schema";
import { fmtTime } from "@/lib/format";

const KIND_TAG: Record<string, string> = {
  task: "tag key",
  event: "tag progress",
  draft: "tag todo",
};

export function Actions({ res }: { res: ReadResult<DailyActions> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Actions log" caption="last briefing run" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.actions.length === 0 ? (
          <EmptyPanel reason="no actions created" />
        ) : (
          <ul className="px-[18px]">
            {res.data.actions.map((a, i) => (
              <li key={i} className="item">
                <div className="item-body">
                  <div className="item-title">
                    <span className={KIND_TAG[a.kind] ?? "tag key"}>{a.kind.toUpperCase()}</span>
                    {a.title}
                  </div>
                  <div className="item-meta">
                    {a.created_at && fmtTime(a.created_at)}
                    {a.detail && <> · {a.detail}</>}
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
