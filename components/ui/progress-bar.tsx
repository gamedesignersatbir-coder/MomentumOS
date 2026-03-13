import { cx } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2.5 rounded-full bg-white/10", className)}>
      <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
