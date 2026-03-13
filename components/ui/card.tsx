import { cx } from "@/lib/utils";

export function Card({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cx("glass", className)}>{children}</section>;
}
