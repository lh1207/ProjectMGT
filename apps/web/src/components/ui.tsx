import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  color = "slate",
}: PropsWithChildren<{ color?: string }>) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ background: `var(--badge-bg, #e2e8f0)` }}
      data-color={color}
    >
      {children}
    </span>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="p-6 text-sm text-slate-500">{label}</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
