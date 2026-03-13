"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = {
  id: number;
  title: string;
  tone?: "success" | "error";
};

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast(toast) {
        const nextToast = { ...toast, id: Date.now() + Math.floor(Math.random() * 1000) };
        setToasts((current) => [...current, nextToast]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== nextToast.id));
        }, 2600);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
              toast.tone === "error" ? "border-rose-300/30" : "border-emerald-300/20"
            }`}
          >
            {toast.tone === "error" ? (
              <XCircle className="h-4 w-4 text-rose-300" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            )}
            <span>{toast.title}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToasterProvider");
  }
  return context;
}
