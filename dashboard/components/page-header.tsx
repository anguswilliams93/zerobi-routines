import { weekOfYear } from "@/lib/format";

export function PageHeader({ generatedAt }: { generatedAt?: string }) {
  const now = generatedAt ? new Date(generatedAt) : new Date();
  const wk = String(weekOfYear(now)).padStart(2, "0");
  const dateLabel = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="page-hdr">
      <div className="eyebrow">Week {wk} · FY26</div>
      <h1>Weekly digest</h1>
      <p className="sub">{dateLabel}</p>
    </header>
  );
}
