"use client";

import { FeedCategory, FeedSource, FilterState, SortOrder } from "@/lib/pulse/types";
import { categoryLabel } from "@/lib/pulse/utils";
import {
  Search,
  Flame,
  Zap,
  Bookmark,
  ArrowUpDown,
  X,
} from "lucide-react";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "importance", label: "Top" },
  { value: "recent", label: "New" },
  { value: "engagement", label: "Hot" },
  { value: "drama", label: "Drama" },
];

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalItems: number;
  dramaItems: number;
  breakingItems: number;
  bookmarkCount: number;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

const CATEGORIES: FeedCategory[] = ["ai", "gaming", "social", "general"];
const SOURCES: { value: FeedSource; label: string }[] = [
  { value: "rss", label: "News" },
  { value: "reddit", label: "Reddit" },
  { value: "hackernews", label: "HN" },
  { value: "bluesky", label: "Bsky" },
  { value: "github", label: "GitHub" },
  { value: "steam", label: "Steam" },
];

export default function PulseFilterBar({
  filters,
  onFilterChange,
  totalItems,
  dramaItems,
  breakingItems,
  bookmarkCount,
  searchRef,
}: FilterBarProps) {
  const isFiltered =
    filters.categories.length > 0 ||
    filters.sources.length > 0 ||
    filters.breakingOnly ||
    filters.bookmarksOnly ||
    filters.minDramaScore > 0 ||
    filters.searchQuery.length > 0 ||
    filters.sortOrder !== "importance";

  const clearAll = () =>
    onFilterChange({
      categories: [],
      sources: [],
      minDramaScore: 0,
      breakingOnly: false,
      bookmarksOnly: false,
      searchQuery: "",
      sortOrder: "importance",
    });

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
    onFilterChange({ ...filters, sources: sources });
  };

  return (
    <div className="border-b border-border bg-surface-raised/80 backdrop-blur-sm sticky top-0 z-20">
      {/* Search row */}
      <div className="px-3 lg:px-4 pt-2.5 pb-1.5">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint" />
          <input
            ref={searchRef as React.Ref<HTMLInputElement>}
            type="text"
            placeholder="Search feeds..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onFilterChange({ ...filters, searchQuery: "" });
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full bg-surface pl-8 pr-12 py-1.5 rounded-lg text-sm text-content placeholder-content-faint border border-border focus:border-content-faint focus:outline-none transition-colors"
          />
          {filters.searchQuery ? (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex px-1.5 py-0.5 rounded bg-surface-overlay text-content-faint font-mono text-[10px] border border-border">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Mobile sort chips — hidden on desktop */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 pt-1 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {SORT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFilterChange({ ...filters, sortOrder: value })}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              filters.sortOrder === value
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-content-faint border border-transparent hover:text-content-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable chips row: categories, sources, special filters, sort, clear, count */}
      <div className="hidden lg:flex gap-2 overflow-x-auto pb-2.5 pt-1 px-3 lg:px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Category toggles */}
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              filters.categories.length === 0 ||
              filters.categories.includes(cat)
                ? cat === "ai"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : cat === "gaming"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : cat === "social"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-zinc-500/20 text-content-muted border border-zinc-500/30"
                : "text-content-faint border border-transparent hover:text-content-muted"
            }`}
          >
            {categoryLabel(cat)}
          </button>
        ))}

        <div className="w-px h-5 bg-border flex-shrink-0 self-center" />

        {/* Source toggles */}
        {SOURCES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => toggleSource(value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              filters.sources.length === 0 || filters.sources.includes(value)
                ? "bg-surface-overlay text-content-secondary border border-border"
                : "text-content-faint border border-transparent hover:text-content-muted"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-5 bg-border flex-shrink-0 self-center" />

        {/* Breaking */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              breakingOnly: !filters.breakingOnly,
              bookmarksOnly: false,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            filters.breakingOnly
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-content-faint border border-transparent hover:text-content-secondary"
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Breaking</span>
          {breakingItems > 0 && (
            <span className="ml-0.5 bg-red-500/30 text-red-400 px-1.5 rounded-full text-[10px]">
              {breakingItems}
            </span>
          )}
        </button>

        {/* Drama */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              minDramaScore: filters.minDramaScore > 0 ? 0 : 35,
              bookmarksOnly: false,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            filters.minDramaScore > 0
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "text-content-faint border border-transparent hover:text-content-secondary"
          }`}
        >
          <Flame className="w-3 h-3" />
          <span>Drama</span>
          {dramaItems > 0 && (
            <span className="ml-0.5 bg-orange-500/30 text-orange-400 px-1.5 rounded-full text-[10px]">
              {dramaItems}
            </span>
          )}
        </button>

        {/* Saved */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              bookmarksOnly: !filters.bookmarksOnly,
              breakingOnly: false,
              minDramaScore: 0,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            filters.bookmarksOnly
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-content-faint border border-transparent hover:text-content-secondary"
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span>Saved</span>
          {bookmarkCount > 0 && (
            <span className="ml-0.5 bg-amber-500/30 text-amber-400 px-1.5 rounded-full text-[10px]">
              {bookmarkCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-border flex-shrink-0 self-center" />

        {/* Sort options */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ArrowUpDown className="w-3 h-3 text-content-faint hidden sm:block" />
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ ...filters, sortOrder: value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filters.sortOrder === value
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-content-faint border border-transparent hover:text-content-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isFiltered && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-content-faint hover:text-content hover:bg-surface-overlay transition-all whitespace-nowrap flex-shrink-0"
            title="Clear all filters"
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        <div className="ml-auto text-xs text-content-muted whitespace-nowrap flex-shrink-0 self-center">
          {totalItems} items
        </div>
      </div>
    </div>
  );
}
