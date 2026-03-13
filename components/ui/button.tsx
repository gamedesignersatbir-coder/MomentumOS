import { cx } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
        variant === "secondary" && "bg-white/10 text-slate-50 hover:bg-white/14",
        variant === "ghost" && "bg-transparent text-slate-200 hover:bg-white/8",
        size === "icon" && "w-11 px-0",
        className
      )}
      {...props}
    />
  );
}
