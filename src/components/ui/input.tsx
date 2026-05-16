import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm shadow-xs",
          className,
        )}
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
      className={cn(
        "min-h-20 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm shadow-xs",
        className,
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-2 text-sm shadow-xs",
          className,
        )}
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
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-[var(--color-danger)]"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-[var(--color-fg-subtle)]">{hint}</span>}
      {error && <span className="block text-xs text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}
