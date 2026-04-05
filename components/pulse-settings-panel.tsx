"use client";

import { useState } from "react";
import { FeedSourceConfig } from "@/lib/pulse/types";
import { RSS_SOURCES, REDDIT_SOURCES, HACKERNEWS_SOURCE, BLUESKY_SOURCE, GITHUB_SOURCE, STEAM_SOURCE } from "@/lib/pulse/feed-sources";
import { loadCustomSources, saveCustomSources, loadDisabledSourceIds, toggleSourceEnabled } from "@/lib/pulse/source-manager";
import { X, Plus, Trash2, Rss, Globe, Github } from "lucide-react";

const SPECIAL_SOURCES: FeedSourceConfig[] = [
  HACKERNEWS_SOURCE,
  BLUESKY_SOURCE,
  GITHUB_SOURCE,
  STEAM_SOURCE,
];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PulseSettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [disabledIds, setDisabledIds] = useState<Set<string>>(loadDisabledSourceIds);
  const [customSources, setCustomSources] = useState<FeedSourceConfig[]>(loadCustomSources);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"ai" | "gaming" | "general">("ai");

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    toggleSourceEnabled(id);
    setDisabledIds(loadDisabledSourceIds());
  };

  const handleAddCustom = () => {
    if (!newUrl.trim() || !newName.trim()) return;
    const source: FeedSourceConfig = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      url: newUrl.trim(),
      type: "rss",
      category: newCategory,
      icon: "✦",
      color: "#e8a945",
      enabled: true,
    };
    const updated = [...customSources, source];
    setCustomSources(updated);
    saveCustomSources(updated);
    setNewUrl("");
    setNewName("");
  };

  const handleRemoveCustom = (id: string) => {
    const updated = customSources.filter((s) => s.id !== id);
    setCustomSources(updated);
    saveCustomSources(updated);
  };

  const allSources = [
    { label: "AI News (RSS)", sources: RSS_SOURCES.filter((s) => s.category === "ai"), icon: <Rss className="w-3 h-3" /> },
    { label: "Gaming News (RSS)", sources: RSS_SOURCES.filter((s) => s.category === "gaming"), icon: <Rss className="w-3 h-3" /> },
    { label: "Reddit", sources: REDDIT_SOURCES, icon: <Globe className="w-3 h-3" /> },
    { label: "Other Sources", sources: SPECIAL_SOURCES, icon: <Github className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-content">Source Management</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-overlay text-content-faint hover:text-content-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-5 space-y-6">
          {allSources.map(({ label, sources, icon }) => (
            <section key={label}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
                {icon}
                {label}
              </h3>
              <div className="space-y-1">
                {sources.map((source) => {
                  const enabled = !disabledIds.has(source.id);
                  return (
                    <label
                      key={source.id}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggle(source.id)}
                        className="w-3.5 h-3.5 rounded border-border bg-surface text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                      <span
                        className="w-5 text-center text-[10px] font-bold"
                        style={{ color: source.color }}
                      >
                        {source.icon}
                      </span>
                      <span className={`text-xs flex-1 ${enabled ? "text-content-secondary" : "text-content-faint line-through"}`}>
                        {source.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2 flex items-center gap-1.5">
              <Plus className="w-3 h-3" />
              Custom RSS Feeds
            </h3>

            {customSources.length > 0 && (
              <div className="space-y-1 mb-3">
                {customSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay"
                  >
                    <span className="text-[10px] text-amber-400">✦</span>
                    <span className="text-xs text-content-secondary flex-1 truncate">{source.name}</span>
                    <span className="text-[10px] text-content-faint truncate max-w-[120px]">{source.url}</span>
                    <button
                      onClick={() => handleRemoveCustom(source.id)}
                      className="p-0.5 text-content-faint hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Feed name (e.g. My Blog)"
                className="w-full bg-surface-overlay px-3 py-1.5 rounded text-xs text-content placeholder-content-faint border border-border focus:border-content-faint focus:outline-none"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="RSS feed URL (e.g. https://example.com/feed.xml)"
                className="w-full bg-surface-overlay px-3 py-1.5 rounded text-xs text-content placeholder-content-faint border border-border focus:border-content-faint focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as "ai" | "gaming" | "general")}
                  className="bg-surface-overlay px-2 py-1.5 rounded text-xs text-content-secondary border border-border focus:outline-none"
                >
                  <option value="ai">AI</option>
                  <option value="gaming">Gaming</option>
                  <option value="general">General</option>
                </select>
                <button
                  onClick={handleAddCustom}
                  disabled={!newUrl.trim() || !newName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Feed
                </button>
              </div>
            </div>
          </section>

          <p className="text-[10px] text-content-faint text-center">
            Changes take effect on next feed refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
