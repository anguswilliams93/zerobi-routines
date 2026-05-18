import { ZbCard, ZbCardHead, ZbCardBody, EmptyPanel } from "@/components/zb-card";
import type { ReadResult } from "@/lib/raw";
import type { WeeklyJira } from "@/lib/schema";

const STATUS_TAG: Record<string, string> = {
  Done: "tag done",
  "In Progress": "tag progress",
  Blocked: "tag blocked",
  "To Do": "tag todo",
};

export function JiraTasks({ res }: { res: ReadResult<WeeklyJira> }) {
  return (
    <ZbCard>
      <ZbCardHead title="Assigned tasks" caption="jira · current user" />
      <ZbCardBody className="!p-0">
        {res.stale ? (
          <EmptyPanel reason={res.reason} />
        ) : res.data.issues.length === 0 ? (
          <EmptyPanel reason="no assigned tasks" />
        ) : (
          <ul className="px-[18px]">
            {res.data.issues.map((j, i) => (
              <li key={i} className="item">
                <div className="item-body">
                  <div className="item-title">
                    <span className={STATUS_TAG[j.status] ?? "tag key"}>{j.status}</span>
                    {j.summary}
                  </div>
                  <div className="item-meta">
                    {j.key}
                    {j.priority && <> · {j.priority}</>}
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
