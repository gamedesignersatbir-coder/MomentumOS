"use client";

import { useState, useCallback } from "react";
import { FeedItem } from "@/lib/pulse/types";
import { searchHistory, getHistoryStats } from "@/lib/pulse/item-history";
import { timeAgo, categoryColor } from "@/lib/pulse/utils";
import { History, Search, X, ExternalLink } from "lucide-react";

interface HistorySearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PulseHistorySearch({ isOpen, onClose }: HistorySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FeedItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<{ totalItems: number; oldestDate: string | null } | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const items = await searchHistory(query.trim());
      setResults(items);
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, [query]);

  const loadStats = useCallback(async () => {
    const s = await getHistoryStats();
    setStats(s);
  }, []);

  if (isOpen && !stats) {
    loadStats();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised border border-border rounded-xl w-full max-w-xl max-h-[80vh] overflow-hidden shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-500" />
            <h2 className="text-sm font-semibold text-content">Topic History</h2>
            {stats && (
              <span className="text-[10px] text-content-faint">
                {stats.totalItems.toLocaleString()} items stored
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-overlay text-content-faint hover:text-content-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search past 7 days... (e.g. OpenAI, layoffs, Steam)"
                className="w-full bg-surface pl-8 pr-3 py-2 rounded-lg text-xs text-content placeholder-content-faint border border-border focus:border-content-faint focus:outline-none"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-4">
          {!hasSearched && (
            <div className="text-center py-12">
              <History className="w-8 h-8 text-content-faint mx-auto mb-3" />
              <p className="text-xs text-content-muted">
                Search across the last 7 days of tracked news
              </p>
              <p className="text-[10px] text-content-faint mt-1">
                Items are stored locally in your browser
              </p>
            </div>
          )}

          {hasSearched && results.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <p className="text-xs text-content-muted">No results found for &quot;{query}&quot;</p>
              <p className="text-[10px] text-content-faint mt-1">
                History builds up as you use PulseFeed
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-content-faint mb-2">
                {results.length} results
              </p>
              {results.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-border hover:bg-surface-overlay transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${categoryColor(item.category)}`}
                    >
                      {item.category}
                    </span>
                    <span className="text-[10px] text-content-muted">{item.source}</span>
                    <span className="text-[10px] text-content-faint">{timeAgo(item.publishedAt)}</span>
                    <ExternalLink className="w-3 h-3 text-content-faint opacity-0 group-hover:opacity-100 ml-auto" />
                  </div>
                  <p className="text-xs font-medium text-content-secondary group-hover:text-content line-clamp-2">
                    {item.title}
                  </p>
                  {(item.aiSummary || item.summary) && (
                    <p className="text-[10px] text-content-muted line-clamp-1 mt-1">
                      {item.aiSummary ? (
                        <span className="text-amber-400/70 mr-1 font-medium">AI:</span>
                      ) : null}
                      {item.aiSummary || item.summary}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
