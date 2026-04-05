"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { FeedItem, FilterState } from "@/lib/pulse/types";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useNotifications, requestNotificationPermission } from "@/hooks/use-notifications";
import {
  loadFilters,
  saveFilters,
  loadReadItems,
  saveReadItems,
  loadBookmarkedItems,
  saveBookmarkedItems,
  loadBookmarkIds,
  loadSettings,
  saveSettings,
  UserSettings,
} from "@/lib/pulse/storage";
import { loadDisabledSourceIds } from "@/lib/pulse/source-manager";
import { storeItems, pruneOldItems } from "@/lib/pulse/item-history";
import { useTheme } from "@/hooks/use-theme";
import PulseFeedCard from "./pulse-feed-card";
import PulseFilterBar from "./pulse-filter-bar";
import PulseBreakingTicker from "./pulse-breaking-ticker";
import PulseTrendingPanel from "./pulse-trending-panel";
import PulseSidebar from "./pulse-sidebar";
import PulseLiveIndicator from "./pulse-live-indicator";
import PulseKeyboardShortcutsHelp from "./pulse-keyboard-shortcuts-help";
import PulseSettingsPanel from "./pulse-settings-panel";
import PulseHistorySearch from "./pulse-history-search";
import PulseBottomSheetFilters from "./pulse-bottom-sheet-filters";
import PulseBottomSheetTrending from "./pulse-bottom-sheet-trending";
import { CheckCheck } from "lucide-react";

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  sources: [],
  minDramaScore: 0,
  breakingOnly: false,
  bookmarksOnly: false,
  searchQuery: "",
  sortOrder: "importance",
};

export function PulseDashboard() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingItems, setPendingItems] = useState<FeedItem[]>([]);
  const [newItemCount, setNewItemCount] = useState(0);

  const [settings, setSettings] = useState<UserSettings>({
    autoRefresh: true,
    notificationsEnabled: false,
    soundEnabled: true,
  });

  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<FeedItem[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [trendingSheetOpen, setTrendingSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { resolvedTheme, toggleTheme } = useTheme();

  const searchRef = useRef<HTMLInputElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters(loadFilters(DEFAULT_FILTERS));
    setReadItems(loadReadItems());
    setBookmarkedItems(loadBookmarkedItems());
    setBookmarkIds(loadBookmarkIds());
    setSettings(loadSettings());
    pruneOldItems().catch(() => {});
  }, []);

  useEffect(() => {
    saveFilters(filters);
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const fetchFeeds = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      setError(null);
      const disabledIds = Array.from(loadDisabledSourceIds());
      const params = disabledIds.length > 0 ? `?disabled=${disabledIds.join(",")}` : "";
      const res = await fetch(`/api/feeds${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const feedItems: FeedItem[] = data.items || [];
      setItems((prev) => {
        if (prev.length === 0) return feedItems;
        const currentIds = new Set(prev.map((i) => i.id));
        const genuinelyNew = feedItems.filter((i) => !currentIds.has(i.id));
        if (genuinelyNew.length > 0) {
          setPendingItems(feedItems);
          const visibleNew = genuinelyNew.filter((item) => {
            if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
            if (filters.sources.length > 0 && !filters.sources.includes(item.sourceType)) return false;
            if (filters.breakingOnly && !item.isBreaking) return false;
            if (item.dramaScore < filters.minDramaScore) return false;
            return true;
          });
          setNewItemCount(visibleNew.length > 0 ? genuinelyNew.length : 0);
          return prev;
        }
        return feedItems;
      });
      setLastUpdated(data.meta?.fetchedAt || new Date().toISOString());
      storeItems(feedItems).catch(() => {});
    } catch (err) {
      setError("Failed to load feeds. Retrying...");
      console.error("Fetch error:", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const backgroundRefresh = useCallback(() => fetchFeeds(true), [fetchFeeds]);
  const { secondsUntilRefresh } = useAutoRefresh(backgroundRefresh, 120_000, settings.autoRefresh);

  useNotifications(items, settings.notificationsEnabled, settings.soundEnabled);

  const markAsRead = useCallback((id: string) => {
    setReadItems((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadItems(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadItems((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      saveReadItems(next);
      return next;
    });
  }, [items]);

  const handleTopicClick = useCallback((topic: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: topic }));
  }, []);

  const loadNewStories = useCallback(() => {
    if (pendingItems.length === 0) return;
    setItems(pendingItems);
    setPendingItems([]);
    setNewItemCount(0);
    storeItems(pendingItems).catch(() => {});
  }, [pendingItems]);

  const toggleBookmark = useCallback(
    (id: string) => {
      setBookmarkedItems((prev) => {
        let next: FeedItem[];
        if (prev.some((i) => i.id === id)) {
          next = prev.filter((i) => i.id !== id);
        } else {
          const item = items.find((i) => i.id === id);
          next = item ? [...prev, item] : prev;
        }
        saveBookmarkedItems(next);
        setBookmarkIds(new Set(next.map((i) => i.id)));
        return next;
      });
    },
    [items]
  );

  const toggleAutoRefresh = useCallback(() => {
    setSettings((prev) => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) setSettings((prev) => ({ ...prev, notificationsEnabled: true }));
    } else {
      setSettings((prev) => ({ ...prev, notificationsEnabled: false }));
    }
  }, [settings.notificationsEnabled]);

  const toggleSound = useCallback(() => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const filteredItems = useMemo(() => {
    const sourceItems = filters.bookmarksOnly ? bookmarkedItems : items;

    const filtered = sourceItems.filter((item) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.summary.toLowerCase().includes(q) &&
          !(item.aiSummary ?? "").toLowerCase().includes(q) &&
          !item.source.toLowerCase().includes(q) &&
          !item.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          return false;
        }
      }

      if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(item.sourceType)) return false;
      if (filters.breakingOnly && !item.isBreaking) return false;
      if (item.dramaScore < filters.minDramaScore) return false;

      return true;
    });

    const sorted = [...filtered];
    switch (filters.sortOrder) {
      case "recent":
        sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case "engagement":
        sorted.sort((a, b) => {
          const scoreA = (a.engagement.upvotes ?? 0) + (a.engagement.comments ?? 0) * 2 + (a.engagement.score ?? 0);
          const scoreB = (b.engagement.upvotes ?? 0) + (b.engagement.comments ?? 0) * 2 + (b.engagement.score ?? 0);
          return scoreB - scoreA;
        });
        break;
      case "drama":
        sorted.sort((a, b) => b.dramaScore - a.dramaScore);
        break;
      default:
        break;
    }
    return sorted;
  }, [items, bookmarkedItems, filters]);

  const breakingItems = items.filter((i) => i.isBreaking);
  const dramaItems = items.filter((i) => i.dramaScore >= 35);

  const activeFilterCount =
    filters.categories.length +
    filters.sources.length +
    (filters.breakingOnly ? 1 : 0) +
    (filters.bookmarksOnly ? 1 : 0) +
    (filters.minDramaScore > 0 ? 1 : 0);

  const { focusedIndex } = useKeyboardNavigation(filteredItems.length, {
    onOpen: (index) => {
      const item = filteredItems[index];
      if (item) {
        markAsRead(item.id);
        window.open(item.url, "_blank", "noopener,noreferrer");
      }
    },
    onRefresh: () => fetchFeeds(),
    onFocusSearch: () => searchRef.current?.focus(),
    onBookmark: (index) => {
      const item = filteredItems[index];
      if (item) toggleBookmark(item.id);
    },
    onMarkAllRead: markAllAsRead,
    onToggleHelp: () => setShowHelp((v) => !v),
  });

  return (
    <div className="flex h-full lg:overflow-hidden bg-surface text-content">
      <PulseSidebar
        items={items}
        filteredItems={filteredItems}
        isLoading={isLoading}
        autoRefresh={settings.autoRefresh}
        secondsUntilRefresh={secondsUntilRefresh}
        lastUpdated={lastUpdated}
        notificationsEnabled={settings.notificationsEnabled}
        soundEnabled={settings.soundEnabled}
        onRefresh={() => fetchFeeds()}
        onToggleAutoRefresh={toggleAutoRefresh}
        onToggleNotifications={toggleNotifications}
        onToggleSound={toggleSound}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <PulseBreakingTicker items={breakingItems} />

        <PulseFilterBar
          filters={filters}
          onFilterChange={setFilters}
          totalItems={filteredItems.length}
          dramaItems={dramaItems.length}
          breakingItems={breakingItems.length}
          bookmarkCount={bookmarkedItems.length}
          searchRef={searchRef}
        />

        <div ref={feedScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-5 pb-16 lg:pb-5">
            <div className="flex items-center justify-between mb-4">
              <PulseLiveIndicator
                isLive={settings.autoRefresh}
                itemCount={items.length}
                unreadCount={items.filter((i) => !readItems.has(i.id)).length}
              />
              <div className="flex items-center gap-2">
                {error && (
                  <button
                    onClick={() => fetchFeeds()}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    title="Click to retry"
                  >
                    <span>{error}</span>
                    <span className="underline">Retry</span>
                  </button>
                )}
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-content-muted hover:text-content-secondary transition-colors"
                  title="Mark all as read (m)"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              </div>
            </div>

            {newItemCount > 0 && (
              <button
                onClick={loadNewStories}
                className="w-full mb-4 py-2.5 px-4 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-600/30 transition-colors flex items-center justify-center gap-2"
              >
                <span>↑</span>
                <span>Load {newItemCount} new {newItemCount === 1 ? "story" : "stories"}</span>
              </button>
            )}

            {isLoading && items.length === 0 && (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface-raised p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-surface-overlay rounded" />
                        <div className="h-4 w-full bg-surface-overlay rounded" />
                        <div className="h-4 w-3/4 bg-surface-overlay rounded" />
                        <div className="h-3 w-1/2 bg-surface-overlay rounded" />
                      </div>
                      <div className="w-20 h-20 bg-surface-overlay rounded-lg flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-16">
                <p className="text-content-muted text-sm">
                  {filters.bookmarksOnly
                    ? "No bookmarked items yet. Click the bookmark icon on any card to save it."
                    : "No items match your filters."}
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-2 text-xs text-amber-400 hover:text-amber-300"
                >
                  Clear all filters
                </button>
              </div>
            )}

            <div className="space-y-4">
              {filteredItems.map((item, index) => (
                <PulseFeedCard
                  key={item.id}
                  item={item}
                  isRead={readItems.has(item.id)}
                  isBookmarked={bookmarkIds.has(item.id)}
                  isFocused={focusedIndex === index}
                  searchQuery={filters.searchQuery}
                  onMarkRead={markAsRead}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>

            <div className="h-8" />
          </div>
        </div>

        {/* Mobile bottom bar — hidden on desktop */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-surface-raised/95 backdrop-blur-sm border-t border-border">
          <button
            onClick={() => { setFiltersOpen(true); setTrendingSheetOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtersOpen
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-surface text-content-secondary border border-border"
            }`}
          >
            <span>⚙</span>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-amber-500/30 text-amber-400 px-1.5 rounded-full text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="text-xs text-content-muted">{filteredItems.length} items</span>

          <button
            onClick={() => { setTrendingSheetOpen(true); setFiltersOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              trendingSheetOpen
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-surface text-content-secondary border border-border"
            }`}
          >
            <span>📈</span>
            <span>Trending</span>
          </button>
        </div>
      </div>

      <PulseTrendingPanel
        items={items}
        isOpen={trendingOpen}
        onClose={() => setTrendingOpen(false)}
        onTopicClick={handleTopicClick}
      />

      <PulseKeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <PulseSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <PulseHistorySearch isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <PulseBottomSheetFilters
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        dramaItems={dramaItems.length}
        breakingItems={breakingItems.length}
        bookmarkCount={bookmarkedItems.length}
      />

      <PulseBottomSheetTrending
        items={items}
        isOpen={trendingSheetOpen}
        onClose={() => setTrendingSheetOpen(false)}
        onTopicClick={handleTopicClick}
      />
    </div>
  );
}
