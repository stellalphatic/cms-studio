import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] " +
  "text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] " +
  "transition shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4)] " +
  "hover:border-[var(--color-border-strong)] " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(base, "h-10 px-3 text-sm leading-none", className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(base, "min-h-24 px-3 py-2.5 text-sm leading-6 resize-y", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, style, ...rest }, ref) {
    // SVG caret embedded as a data URL — keeps the component a single element
    // so consumer width classes (w-44, flex-1, etc.) pass through cleanly.
    const caret =
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'><path d='M2.5 4.5L6 8l3.5-3.5' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";
    return (
      <select
        ref={ref}
        className={cn(base, "h-10 appearance-none pl-3 pr-9 text-sm leading-none", className)}
        style={{
          backgroundImage: caret,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "0.75rem",
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  hint,
  error,
  children,
  required,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium tracking-tight text-[var(--color-fg)]">
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden>
              *
            </span>
          )}
        </span>
        {hint && !error && (
          <span className="text-[11px] font-normal text-[var(--color-fg-subtle)]">{hint}</span>
        )}
      </label>
      {children}
      {error && (
        <span className="block text-xs font-medium text-[var(--color-danger)]">{error}</span>
      )}
    </div>
  );
}
