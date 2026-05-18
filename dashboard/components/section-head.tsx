export function SectionHead({
  source,
  title,
  italic,
  note,
}: {
  source?: string;
  title: string;
  italic?: string;
  note?: React.ReactNode;
  // legacy props — accepted but ignored to avoid churn
  breadcrumb?: string;
  subtitle?: string;
  src?: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="sec-hdr">
      <div>
        {source && <div className="src">{source}</div>}
        <h2>
          {title}
          {italic && <> <span className="it">{italic}</span></>}
        </h2>
      </div>
      {note && <div className="note">{note}</div>}
    </header>
  );
}
