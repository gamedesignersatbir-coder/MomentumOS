import { cx } from "@/lib/utils";

type FieldProps = {
  as?: "input" | "textarea";
  label?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Field({ as = "input", className, label, ...props }: FieldProps) {
  const baseClassName = cx(
    "w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500",
    className
  );

  return (
    <label className="grid gap-2 text-sm">
      {label ? <span className="text-slate-200/85">{label}</span> : null}
      {as === "textarea" ? (
        <textarea className={baseClassName} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className={cx("h-11", baseClassName)} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}
    </label>
  );
}
