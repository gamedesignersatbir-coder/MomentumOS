import { FeedCategory } from "@/lib/pulse/types";

export function categoryLabel(category: FeedCategory): string {
  const labels: Record<FeedCategory, string> = {
    ai: "AI & ML",
    gaming: "Gaming",
    drama: "Drama",
    breaking: "Breaking",
    social: "Social",
    general: "General",
  };
  return labels[category] ?? category;
}

export function categoryColor(category: FeedCategory): string {
  const colors: Record<FeedCategory, string> = {
    ai: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    gaming: "bg-green-500/20 text-green-400 border-green-500/30",
    drama: "bg-red-500/20 text-red-400 border-red-500/30",
    breaking: "bg-red-500/20 text-red-400 border-red-500/30",
    social: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    general: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return colors[category] ?? colors.general;
}

export function categoryDotColor(category: FeedCategory): string {
  const colors: Record<FeedCategory, string> = {
    ai: "bg-amber-500",
    gaming: "bg-green-500",
    drama: "bg-red-500",
    breaking: "bg-red-500",
    social: "bg-cyan-500",
    general: "bg-zinc-500",
  };
  return colors[category] ?? colors.general;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function dramaBarColor(score: number): string {
  if (score >= 60) return "bg-red-500";
  if (score >= 35) return "bg-orange-500";
  if (score >= 15) return "bg-yellow-500";
  return "bg-zinc-600";
}
