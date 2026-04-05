"use client";

import { FeedItem } from "@/lib/pulse/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/pulse/feed-sources";
import PulseThemeToggle from "./pulse-theme-toggle";
import {
  Radio,
  Rss,
  Globe,
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  Settings,
  History,
  Github,
  Gamepad2,
} from "lucide-react";

interface SidebarProps {
  items: FeedItem[];
  filteredItems: FeedItem[];
  isLoading: boolean;
  autoRefresh: boolean;
  secondsUntilRefresh: number;
  lastUpdated: string | null;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onToggleNotifications: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function PulseSidebar({
  items,
  filteredItems,
  isLoading,
  autoRefresh,
  secondsUntilRefresh,
  lastUpdated,
  notificationsEnabled,
  soundEnabled,
  onRefresh,
  onToggleAutoRefresh,
  onToggleNotifications,
  onToggleSound,
  onOpenSettings,
  onOpenHistory,
  resolvedTheme,
  onToggleTheme,
  isOpen,
  onClose,
}: SidebarProps) {
  const sourceCounts = new Map<string, number>();
  const filteredSourceCounts = new Map<string, number>();
  for (const item of items) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1);
  }
  for (const item of filteredItems) {
    filteredSourceCounts.set(item.source, (filteredSourceCounts.get(item.source) || 0) + 1);
  }
  const isFiltering = filteredItems.length !== items.length;

  const aiRssCount = items.filter((i) => i.sourceType === "rss" && i.category === "ai").length;
  const gamingRssCount = items.filter((i) => i.sourceType === "rss" && i.category === "gaming").length;
  const redditCount = items.filter((i) => i.sourceType === "reddit").length;
  const hnCount = items.filter((i) => i.sourceType === "hackernews").length;
  const blueskyCount = items.filter((i) => i.sourceType === "bluesky").length;
  const githubCount = items.filter((i) => i.sourceType === "github").length;
  const steamCount = items.filter((i) => i.sourceType === "steam").length;

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-40 w-64 lg:w-56 transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:flex-shrink-0
        border-r border-border overflow-y-auto bg-surface-raised
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-content tracking-tight">Pulse</h1>
            <p className="text-[11px] text-content-muted">AI & Gaming Radar</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-overlay text-content-faint lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6 space-y-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Fetching..." : "Refresh Now"}
          </button>

          <div className="flex gap-1.5">
            <button
              onClick={onToggleAutoRefresh}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                autoRefresh
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-surface-overlay border border-border text-content-faint"
              }`}
              title="Toggle auto-refresh"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-content-faint"}`} />
              Auto
            </button>

            <button
              onClick={onToggleNotifications}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                notificationsEnabled
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-surface-overlay border border-border text-content-faint"
              }`}
              title="Toggle breaking news notifications"
            >
              {notificationsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              Alerts
            </button>

            <button
              onClick={onToggleSound}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                soundEnabled
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                  : "bg-surface-overlay border border-border text-content-faint"
              }`}
              title="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
          </div>

          {lastUpdated && (
            <p className="text-[11px] text-content-muted text-center">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
              {autoRefresh && !isLoading && (
                <span className="ml-1 text-content-faint">· {secondsUntilRefresh}s</span>
              )}
            </p>
          )}
        </div>

        <div className="mb-6 flex gap-1.5">
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-surface-overlay border border-border text-content-muted hover:text-content-secondary transition-all"
            title="Manage sources"
          >
            <Settings className="w-3 h-3" />
            Sources
          </button>
          <button
            onClick={onOpenHistory}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-surface-overlay border border-border text-content-muted hover:text-content-secondary transition-all"
            title="Search topic history"
          >
            <History className="w-3 h-3" />
            History
          </button>
          <PulseThemeToggle resolvedTheme={resolvedTheme} onToggle={onToggleTheme} />
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
              <Rss className="w-3 h-3" />
              AI News
              <span className="ml-auto text-content-faint">{aiRssCount}</span>
            </h3>
            <div className="space-y-0.5">
              {RSS_SOURCES.filter((s) => s.category === "ai" && s.enabled).map((source) => (
                <div key={source.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-content-secondary hover:bg-surface-overlay transition-colors">
                  <span className="w-5 text-center text-[10px] font-bold" style={{ color: source.color }}>{source.icon}</span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-content-faint text-[11px]">
                    {isFiltering
                      ? `${filteredSourceCounts.get(source.name) || 0}/${sourceCounts.get(source.name) || 0}`
                      : sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
              <Rss className="w-3 h-3" />
              Gaming
              <span className="ml-auto text-content-faint">{gamingRssCount}</span>
            </h3>
            <div className="space-y-0.5">
              {RSS_SOURCES.filter((s) => s.category === "gaming" && s.enabled).map((source) => (
                <div key={source.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-content-secondary hover:bg-surface-overlay transition-colors">
                  <span className="w-5 text-center text-[10px] font-bold" style={{ color: source.color }}>{source.icon}</span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-content-faint text-[11px]">
                    {isFiltering
                      ? `${filteredSourceCounts.get(source.name) || 0}/${sourceCounts.get(source.name) || 0}`
                      : sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Reddit
              <span className="ml-auto text-content-faint">{redditCount}</span>
            </h3>
            <div className="space-y-0.5">
              {REDDIT_SOURCES.filter((s) => s.enabled).map((source) => (
                <div key={source.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-content-secondary hover:bg-surface-overlay transition-colors">
                  <span className="w-5 text-center text-[10px]">{source.icon}</span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-content-faint text-[11px]">
                    {isFiltering
                      ? `${filteredSourceCounts.get(source.name) || 0}/${sourceCounts.get(source.name) || 0}`
                      : sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {hnCount > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Hacker News
                <span className="ml-auto text-content-faint">{hnCount}</span>
              </h3>
            </section>
          )}

          {blueskyCount > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Bluesky
                <span className="ml-auto text-content-faint">{blueskyCount}</span>
              </h3>
            </section>
          )}

          {githubCount > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
                <Github className="w-3 h-3" />
                GitHub Trending
                <span className="ml-auto text-content-faint">{githubCount}</span>
              </h3>
            </section>
          )}

          {steamCount > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
                <Gamepad2 className="w-3 h-3" />
                Steam News
                <span className="ml-auto text-content-faint">{steamCount}</span>
              </h3>
            </section>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[11px] text-content-muted text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-surface-overlay text-content-secondary font-mono text-[10px]">?</kbd> for keyboard shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
