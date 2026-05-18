import { cn } from "@/lib/utils";

export function ZbCard({ className, children, ...rest }: React.ComponentProps<"section">) {
  return (
    <section className={cn("zb-card", className)} {...rest}>
      {children}
    </section>
  );
}

export function ZbCardHead({
  title,
  caption,
}: {
  title: string;
  caption?: React.ReactNode;
  dot?: boolean; // kept in signature for backwards compat, ignored
}) {
  return (
    <header className="card-hd">
      <span>{title}</span>
      {caption && <span className="mono text-[var(--ink-4)] text-[10px] tracking-wider">{caption}</span>}
    </header>
  );
}

export function ZbCardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card-bd", className)}>{children}</div>;
}

export function EmptyPanel({ reason }: { reason: string }) {
  return <div className="empty">{reason}</div>;
}
