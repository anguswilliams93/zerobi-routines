const LINKS = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "email", label: "Email" },
  { id: "tasks", label: "Tasks" },
  { id: "money", label: "Money" },
  { id: "obligations", label: "Obligations" },
];

export function SideNav({ live = true }: { live?: boolean }) {
  return (
    <nav className="nav" aria-label="Sections">
      <span className="nav-brand" role="img" aria-label="Zerobi" />
      <div className="nav-meta">
        <span className="dot" />
        {live ? "Live" : "Stale"}
      </div>
      {LINKS.map((l, i) => (
        <a key={l.id} href={`#${l.id}`} className="nav-link">
          <span className="idx">{String(i).padStart(2, "0")}</span>
          <span className="lbl">{l.label}</span>
        </a>
      ))}
      <div className="nav-foot">
        Daily &amp; weekly briefs<br />
        pulled via Zapier &amp; Xero MCP.
      </div>
    </nav>
  );
}
