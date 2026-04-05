"use client";

interface LiveIndicatorProps {
  isLive: boolean;
  itemCount: number;
  unreadCount: number;
}

export default function PulseLiveIndicator({ isLive, itemCount, unreadCount }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive ? "bg-green-500 animate-pulse" : "bg-content-faint"
          }`}
        />
        <span className="text-xs font-medium text-content-muted">
          {isLive ? "LIVE" : "PAUSED"}
        </span>
      </div>
      {unreadCount > 0 && (
        <span className="text-xs text-amber-400 font-medium">
          {unreadCount} unread
        </span>
      )}
    </div>
  );
}
