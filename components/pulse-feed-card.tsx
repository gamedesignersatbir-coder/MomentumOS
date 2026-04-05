"use client";

import { useRef, useEffect, useState } from "react";
import { FeedItem } from "@/lib/pulse/types";
import { categoryColor, timeAgo, formatNumber, dramaBarColor } from "@/lib/pulse/utils";
import { dramaLevelEmoji } from "@/lib/pulse/scorer";
import { quickCaptureAction } from "@/app/actions";
import {
  MessageSquare,
  ArrowUp,
  ExternalLink,
  Flame,
  Zap,
  Bookmark,
  Copy,
  Check,
} from "lucide-react";

interface FeedCardProps {
  item: FeedItem;
  isRead: boolean;
  isBookmarked: boolean;
  isFocused: boolean;
  searchQuery?: string;
  onMarkRead: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-500/30 text-amber-200 dark:text-amber-200 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function PulseFeedCard({
  item,
  isRead,
  isBookmarked,
  isFocused,
  searchQuery = "",
  onMarkRead,
  onToggleBookmark,
}: FeedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const handleLearn = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = '/learn/new?goal=' + encodeURIComponent(item.title);
  };

  const handleAddTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await quickCaptureAction(item.title);
    setTaskAdded(true);
    setTimeout(() => setTaskAdded(false), 2000);
  };

  const hasEngagement =
    (item.engagement.comments ?? 0) > 0 ||
    (item.engagement.upvotes ?? 0) > 0 ||
    (item.engagement.score ?? 0) > 0;

  const ageMs = Date.now() - new Date(item.publishedAt).getTime();
  const ageHours = ageMs / 3_600_000;
  const ageMinutes = ageMs / 60_000;
  const isFresh = ageMinutes < 5;
  const ageClass = ageHours > 24 ? "opacity-65" : ageHours > 8 ? "opacity-80" : "";

  const showBreakingGlow = item.isBreaking && ageHours < 2;

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isFocused]);

  const handleCardClick = () => {
    onMarkRead(item.id);
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(item.id);
  };

  return (
    <div
      ref={cardRef}
      role="article"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      className={`group block rounded-xl border bg-surface-raised p-4 transition-all duration-200 cursor-pointer
        hover:bg-surface-overlay hover:border-content-faint hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30 animate-slide-in
        ${isFocused ? "ring-2 ring-amber-500/60 border-amber-500/40" : ""}
        ${isRead ? "opacity-70" : ageClass}
        ${
          showBreakingGlow
            ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
            : item.dramaScore >= 35
              ? "border-orange-500/30"
              : "border-border"
        }`}
    >
      {/* Breaking badge */}
      {item.isBreaking && (
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-500">Breaking</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {/* Source + time row */}
          <div className="flex items-center gap-2 mb-1.5">
            {!isRead && (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFresh ? "bg-green-400 animate-pulse" : "bg-amber-500"}`} />
            )}
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor(item.category)}`}
            >
              {item.category === "ai" ? "AI" : item.category === "gaming" ? "Gaming" : item.category === "social" ? "Social" : "General"}
            </span>
            <span className="text-xs text-content-muted">
              {item.source}
              {item.sourceType === "hackernews" && (() => {
                try {
                  return <span className="text-content-faint"> ({new URL(item.url).hostname.replace(/^www\./, "")})</span>;
                } catch { return null; }
              })()}
            </span>
            {item.author && (
              <>
                <span className="text-content-faint">·</span>
                <span className="text-xs text-content-muted truncate max-w-[100px]">{item.author}</span>
              </>
            )}
            <span className="text-content-faint">·</span>
            <span className="text-xs text-content-muted">{timeAgo(item.publishedAt)}</span>
            {item.dramaLevel !== "none" && (
              <span className="text-sm ml-auto">{dramaLevelEmoji(item.dramaLevel)}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-semibold text-content leading-snug mb-1 group-hover:text-content line-clamp-2">
            {highlightText(item.title, searchQuery)}
          </h3>

          {/* AI Summary (if present) */}
          {item.aiSummary && (
            <div className="flex items-start gap-1.5 mb-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/10">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded flex-shrink-0 mt-px">
                AI
              </span>
              <p className="text-xs text-amber-600 dark:text-amber-300/80 leading-snug">{item.aiSummary}</p>
            </div>
          )}

          {/* Summary */}
          {item.summary && !item.aiSummary && (
            <p className="text-[13px] text-content-secondary leading-relaxed line-clamp-2 mb-2">
              {item.summary}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-surface-overlay text-content-muted border border-border-muted"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-overlay/50 text-content-faint border border-border-muted">
                  +{item.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: engagement + drama + actions */}
          <div className="flex items-center gap-3">
            {hasEngagement && (
              <div className="flex items-center gap-3 text-content-faint">
                {(item.engagement.upvotes ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {formatNumber(item.engagement.upvotes!)}
                  </span>
                )}
                {(item.engagement.score ?? 0) > 0 && !item.engagement.upvotes && (
                  <span className="flex items-center gap-1 text-xs">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {formatNumber(item.engagement.score!)}
                  </span>
                )}
                {(item.engagement.comments ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {formatNumber(item.engagement.comments!)}
                  </span>
                )}
              </div>
            )}

            {/* Drama meter */}
            {item.dramaScore > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Flame
                  className={`w-3.5 h-3.5 ${
                    item.dramaScore >= 60 ? "text-red-500" : item.dramaScore >= 35 ? "text-orange-500" : "text-yellow-600"
                  }`}
                />
                <div className="w-20 h-2 bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dramaBarColor(item.dramaScore)}`}
                    style={{ width: `${item.dramaScore}%` }}
                  />
                </div>
                <span className={`text-[11px] font-medium ${
                  item.dramaScore >= 60 ? "text-red-400" : item.dramaScore >= 35 ? "text-orange-400" : "text-yellow-500"
                }`}>
                  {item.dramaScore}
                </span>
              </div>
            )}

            {/* Bookmark */}
            <button
              onClick={handleBookmarkClick}
              className={`p-1 rounded transition-all ml-auto ${
                isBookmarked
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-content-faint opacity-0 group-hover:opacity-100 hover:text-content-muted"
              } ${isBookmarked ? "opacity-100" : ""}`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} />
            </button>

            <button
              onClick={handleCopy}
              className="p-1 rounded text-content-faint opacity-0 group-hover:opacity-100 hover:text-content-muted transition-all"
              title="Copy link"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>

            {item.redditUrl && (
              <a
                href={item.redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-[11px] text-content-faint opacity-0 group-hover:opacity-100 hover:text-orange-400 transition-all"
                title="Discussion"
              >
                <MessageSquare className="w-3 h-3" />
                discuss
              </a>
            )}

            {/* MomentumOS: → Learn */}
            <button
              onClick={handleLearn}
              className="flex items-center gap-0.5 text-[11px] text-content-faint opacity-0 group-hover:opacity-100 hover:text-amber-400 transition-all px-1 py-0.5 rounded"
              title="Study this topic"
            >
              → Learn
            </button>

            {/* MomentumOS: → Task */}
            <button
              onClick={handleAddTask}
              className={`flex items-center gap-0.5 text-[11px] transition-all px-1 py-0.5 rounded ${
                taskAdded
                  ? "text-green-400"
                  : "text-content-faint opacity-0 group-hover:opacity-100 hover:text-amber-400"
              }`}
              title="Add to inbox as task"
            >
              {taskAdded ? "✓ Task" : "→ Task"}
            </button>

            <ExternalLink className="w-3 h-3 text-content-faint opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-surface-overlay relative">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }}
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                const parent = el.parentElement;
                if (parent) parent.style.display = "none";
              }}
              style={{ opacity: 0, transition: "opacity 0.2s" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
