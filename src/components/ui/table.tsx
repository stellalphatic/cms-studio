import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 text-left">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      scope="col"
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
      {children}
    </tbody>
  );
}

export function TR({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-[var(--color-surface-2)]/70",
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = "left",
  muted,
  mono,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        muted && "text-[var(--color-fg-muted)]",
        mono && "font-mono text-[12px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
