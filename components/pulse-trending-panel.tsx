"use client";

import { useState } from "react";
import { FeedItem, TrendingTopic, TrendVelocity, DramaLevel } from "@/lib/pulse/types";
import { dramaLevelEmoji, dramaLevelColor } from "@/lib/pulse/scorer";
import { categoryColor, formatNumber, timeAgo } from "@/lib/pulse/utils";
import { loadTrendingSnapshot, saveTrendingSnapshot } from "@/lib/pulse/storage";
import { TrendingUp, TrendingDown, Minus, Sparkles, Flame, Clock, X } from "lucide-react";

interface TrendingPanelProps {
  items: FeedItem[];
  isOpen: boolean;
  onClose: () => void;
  onTopicClick?: (topic: string) => void;
}

function getVelocityIcon(velocity: TrendVelocity) {
  switch (velocity) {
    case "rising":
      return <TrendingUp className="w-3 h-3 text-green-400" />;
    case "falling":
      return <TrendingDown className="w-3 h-3 text-red-400" />;
    case "new":
      return <Sparkles className="w-3 h-3 text-amber-400" />;
    default:
      return <Minus className="w-3 h-3 text-content-faint" />;
  }
}

function getVelocityLabel(velocity: TrendVelocity): string {
  switch (velocity) {
    case "rising": return "Rising";
    case "falling": return "Cooling";
    case "new": return "New";
    default: return "";
  }
}

function extractTrending(items: FeedItem[]): TrendingTopic[] {
  const topicCounts = new Map<string, { count: number; items: FeedItem[] }>();

  for (const item of items) {
    for (const tag of item.tags) {
      const existing = topicCounts.get(tag) || { count: 0, items: [] };
      existing.count++;
      existing.items.push(item);
      topicCounts.set(tag, existing);
    }
  }

  let prevTopics: Record<string, number> = {};
  let prevSnapshot: ReturnType<typeof loadTrendingSnapshot> = null;
  try {
    prevSnapshot = loadTrendingSnapshot();
    prevTopics = prevSnapshot?.topics ?? {};
  } catch {
    // Storage not available (SSR) — skip velocity
  }

  const trending = Array.from(topicCounts.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([topic, data]) => {
      const maxDrama = Math.max(...data.items.map((i) => i.dramaScore));
      const categories = data.items.map((i) => i.category);
      const primaryCategory =
        categories.sort(
          (a, b) =>
            categories.filter((c) => c === b).length -
            categories.filter((c) => c === a).length
        )[0] ?? "general";

      const previousMentions = prevTopics[topic] ?? 0;
      let velocity: TrendVelocity = "stable";
      if (previousMentions === 0) {
        velocity = "new";
      } else if (data.count > previousMentions * 1.3) {
        velocity = "rising";
      } else if (data.count < previousMentions * 0.7) {
        velocity = "falling";
      }

      const dramaLevel: DramaLevel =
        maxDrama >= 60 ? "nuclear" : maxDrama >= 35 ? "spicy" : maxDrama >= 15 ? "mild" : "none";

      return {
        topic,
        mentions: data.count,
        category: primaryCategory,
        dramaLevel,
        relatedItems: data.items.map((i) => i.id),
        velocity,
        previousMentions,
      };
    });

  try {
    const THIRTY_MIN = 30 * 60 * 1000;
    const shouldUpdate =
      !prevSnapshot ||
      Date.now() - new Date(prevSnapshot.timestamp).getTime() > THIRTY_MIN;

    if (shouldUpdate) {
      const currentTopics: Record<string, number> = {};
      Array.from(topicCounts.entries()).forEach(([topic, data]) => {
        currentTopics[topic] = data.count;
      });
      saveTrendingSnapshot({
        timestamp: new Date().toISOString(),
        topics: currentTopics,
      });
    }
  } catch {
    // Storage not available
  }

  return trending;
}

export default function PulseTrendingPanel({ items, isOpen, onClose, onTopicClick }: TrendingPanelProps) {
  const trending = extractTrending(items);
  const [dramaExpanded, setDramaExpanded] = useState(false);

  const allDrama = [...items]
    .filter((i) => i.dramaScore >= 25)
    .sort((a, b) => b.dramaScore - a.dramaScore);
  const topDrama = dramaExpanded ? allDrama : allDrama.slice(0, 5);

  const engagementScore = (item: FeedItem) =>
    (item.engagement.upvotes ?? 0) +
    (item.engagement.comments ?? 0) * 3 +
    (item.engagement.likes ?? 0) +
    (item.engagement.score ?? 0);

  const recentHot = [...items]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, 3);

  return (
    <div
      className={`
        fixed inset-y-0 right-0 z-40 w-80 transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:flex-shrink-0
        border-l border-border overflow-y-auto bg-surface-raised
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
    >
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-xs font-semibold text-content-secondary">Trending & Drama</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-overlay text-content-faint">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drama Alert */}
        {topDrama.length > 0 && (
          <section className="border-b border-border-muted pb-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-red-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Drama Alert
              </h2>
            </div>
            <div className="space-y-2">
              {topDrama.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2.5 rounded-lg hover:bg-surface-overlay transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-sm ${dramaLevelColor(item.dramaLevel)}`}>
                      {dramaLevelEmoji(item.dramaLevel)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-content-secondary line-clamp-2 group-hover:text-content">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-content-muted">{item.source}</span>
                        <span className="text-[11px] text-content-faint">Score: {item.dramaScore}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {allDrama.length > 5 && (
              <button
                onClick={() => setDramaExpanded((v) => !v)}
                className="mt-2 w-full text-center text-[11px] text-content-faint hover:text-content-secondary transition-colors py-1.5 rounded-lg hover:bg-surface-overlay"
              >
                {dramaExpanded ? "Show less" : `Show ${allDrama.length - 5} more`}
              </button>
            )}
          </section>
        )}

        {/* Trending Topics */}
        <section className="border-b border-border-muted pb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Trending
            </h2>
          </div>
          {trending.length === 0 ? (
            <p className="text-xs text-content-faint italic">Loading trends...</p>
          ) : (
            <div className="space-y-1.5">
              {trending.map((topic, i) => (
                <div
                  key={topic.topic}
                  className="flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer hover:bg-surface-overlay"
                  onClick={() => { onTopicClick?.(topic.topic); onClose(); }}
                  title={`Filter by "${topic.topic}"`}
                >
                  <span className="text-xs text-content-faint w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-content truncate">{topic.topic}</span>
                      {topic.dramaLevel !== "none" && (
                        <span className="text-[11px]">{dramaLevelEmoji(topic.dramaLevel)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-content-muted">{topic.mentions} mentions</span>
                      {topic.velocity !== "stable" && (
                        <span className="flex items-center gap-0.5">
                          {getVelocityIcon(topic.velocity)}
                          <span
                            className={`text-[10px] font-medium ${
                              topic.velocity === "rising"
                                ? "text-green-400"
                                : topic.velocity === "falling"
                                  ? "text-red-400"
                                  : "text-amber-400"
                            }`}
                          >
                            {getVelocityLabel(topic.velocity)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border ${categoryColor(topic.category)}`}>
                    {topic.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Most Active */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-cyan-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Most Active
            </h2>
          </div>
          <div className="space-y-2">
            {recentHot.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 rounded-lg hover:bg-surface-overlay transition-colors group"
              >
                <p className="text-xs font-medium text-content-secondary line-clamp-2 group-hover:text-content">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-content-muted">
                  <span>{item.source}</span>
                  {(item.engagement.comments ?? 0) > 0 && (
                    <span>{formatNumber(item.engagement.comments!)} comments</span>
                  )}
                  <span>{timeAgo(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
