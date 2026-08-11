import { ReactNode } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-secondary)">{description}</p>
        </div>
        {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
      </div>
    </section>
  );
}

export function SurfaceCard({
  children,
  className,
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <article className={joinClasses(muted ? "workspace-card-muted" : "workspace-card", "p-4", className)}>
      {children}
    </article>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="workspace-section-label">{children}</p>;
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success";
}) {
  return (
    <span
      className={joinClasses(
        "workspace-pill",
        tone === "accent" && "workspace-pill-accent",
        tone === "success" && "workspace-pill-success",
      )}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <SurfaceCard className="p-5">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-(--text-primary)">{value}</p>
      {helper ? <p className="mt-2 text-sm text-(--text-secondary)">{helper}</p> : null}
    </SurfaceCard>
  );
}
