"use client";

import { FeedCategory, FeedSource, FilterState } from "@/lib/pulse/types";
import { categoryLabel, categoryColor } from "@/lib/pulse/utils";
import { Flame, Zap, Bookmark, X } from "lucide-react";

const SORT_OPTIONS: { value: FilterState["sortOrder"]; label: string; emoji: string }[] = [
  { value: "importance", label: "Top", emoji: "⬆" },
  { value: "recent", label: "New", emoji: "🆕" },
  { value: "engagement", label: "Hot", emoji: "🔥" },
  { value: "drama", label: "Drama", emoji: "⚡" },
];

const CATEGORIES: FeedCategory[] = ["ai", "gaming", "social", "general", "drama", "breaking"];

const SOURCES: { value: FeedSource; label: string }[] = [
  { value: "rss", label: "News" },
  { value: "reddit", label: "Reddit" },
  { value: "hackernews", label: "HN" },
  { value: "bluesky", label: "Bsky" },
  { value: "twitter", label: "Twitter" },
  { value: "github", label: "GitHub" },
  { value: "steam", label: "Steam" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  dramaItems: number;
  breakingItems: number;
  bookmarkCount: number;
}

export default function PulseBottomSheetFilters({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  dramaItems,
  breakingItems,
  bookmarkCount,
}: Props) {
  if (!isOpen) return null;

  const toggleCategory = (cat: FeedCategory) => {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ ...filters, categories: cats });
  };

  const toggleSource = (src: FeedSource) => {
    const sources = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src];
    onFilterChange({ ...filters, sources });
  };

  const clearAll = () =>
    onFilterChange({
      categories: [],
      sources: [],
      minDramaScore: 0,
      breakingOnly: false,
      bookmarksOnly: false,
      searchQuery: filters.searchQuery,
      sortOrder: "importance",
    });

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.sources.length > 0 ||
    filters.breakingOnly ||
    filters.bookmarksOnly ||
    filters.minDramaScore > 0 ||
    filters.sortOrder !== "importance";

  return (
    <div className="lg:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-raised border-t border-border rounded-t-2xl max-h-[65vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold text-content">Filters</span>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} className="text-content-faint hover:text-content transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-6 space-y-5">
          {/* Sort */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Sort</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => onFilterChange({ ...filters, sortOrder: value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.sortOrder === value
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-surface text-content-secondary border border-border"
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Sources</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleSource(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.sources.length === 0 || filters.sources.includes(value)
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-surface text-content-faint border border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    filters.categories.length === 0 || filters.categories.includes(cat)
                      ? categoryColor(cat)
                      : "bg-surface text-content-faint border-border"
                  }`}
                >
                  {categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Special */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Special</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange({ ...filters, breakingOnly: !filters.breakingOnly, bookmarksOnly: false })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filters.breakingOnly
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-surface text-content-secondary border border-border"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Breaking
                {breakingItems > 0 && (
                  <span className="bg-red-500/30 text-red-400 px-1.5 rounded-full text-[10px]">{breakingItems}</span>
                )}
              </button>
              <button
                onClick={() => onFilterChange({ ...filters, minDramaScore: filters.minDramaScore > 0 ? 0 : 35, bookmarksOnly: false })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filters.minDramaScore > 0
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-surface text-content-secondary border border-border"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Drama
                {dramaItems > 0 && (
                  <span className="bg-orange-500/30 text-orange-400 px-1.5 rounded-full text-[10px]">{dramaItems}</span>
                )}
              </button>
              <button
                onClick={() => onFilterChange({ ...filters, bookmarksOnly: !filters.bookmarksOnly, breakingOnly: false, minDramaScore: 0 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filters.bookmarksOnly
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-surface text-content-secondary border border-border"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Saved
                {bookmarkCount > 0 && (
                  <span className="bg-amber-500/30 text-amber-400 px-1.5 rounded-full text-[10px]">{bookmarkCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
