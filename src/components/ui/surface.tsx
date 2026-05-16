import { cn } from "@/lib/utils";

/**
 * Surface = a quiet, bordered region. The default unit of layout — but never
 * nest one inside another (use Section divisions instead).
 */
export function Surface({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
      {...rest}
    />
  );
}

/**
 * Section = a typographic block: small uppercase eyebrow + content. Use to
 * carve a Surface into multiple labeled regions without nesting cards.
 */
export function Section({
  title,
  trailing,
  children,
  className,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
          {title}
        </h3>
        {trailing}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-[var(--color-border)]", className)} />;
}

export function Empty({
  title,
  hint,
  action,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-fg)]">{title}</p>
      {hint && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-fg-muted)]">{hint}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KeyValue({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="w-28 shrink-0 text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 flex-1 break-words text-sm text-[var(--color-fg)]",
          mono && "font-mono text-xs text-[var(--color-fg-muted)]",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
