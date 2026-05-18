import { weekOfYear } from "@/lib/format";

export function TerminalHeader({ generatedAt }: { generatedAt?: string }) {
  const now = generatedAt ? new Date(generatedAt) : new Date();
  const wk = String(weekOfYear(now)).padStart(2, "0");
  const dateLabel = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page-header">
      <div className="page-header-inner">
        <div className="page-header-brand">Zerobi</div>
        <h1 className="page-header-title">
          Weekly digest
          <span className="page-header-wk">Wk {wk}</span>
        </h1>
        <p className="page-header-date">{dateLabel}</p>
      </div>
    </div>
  );
}
