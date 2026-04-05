"use client";

import { FeedItem } from "@/lib/pulse/types";

// ── IndexedDB wrapper for topic history ──

const DB_NAME = "pulsefeed_history";
const DB_VERSION = 1;
const STORE_NAME = "items";
const MAX_AGE_DAYS = 7;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("publishedAt", "publishedAt", { unique: false });
        store.createIndex("category", "category", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeItems(items: FeedItem[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const item of items) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // IndexedDB unavailable — silently fail
  }
}

export async function searchHistory(query: string, limit = 50): Promise<FeedItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const all: FeedItem[] = request.result;
        const q = query.toLowerCase();
        const matches = all
          .filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.summary.toLowerCase().includes(q) ||
              item.tags.some((t) => t.toLowerCase().includes(q)) ||
              item.source.toLowerCase().includes(q)
          )
          .sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime()
          )
          .slice(0, limit);
        resolve(matches);
      };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    return [];
  }
}

export async function getHistoryStats(): Promise<{ totalItems: number; oldestDate: string | null }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const countReq = store.count();
      countReq.onsuccess = () => {
        const total = countReq.result;
        const index = store.index("publishedAt");
        const cursorReq = index.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          db.close();
          resolve({
            totalItems: total,
            oldestDate: cursor ? cursor.value.publishedAt : null,
          });
        };
        cursorReq.onerror = () => { db.close(); resolve({ totalItems: total, oldestDate: null }); };
      };
      countReq.onerror = () => { db.close(); reject(countReq.error); };
    });
  } catch {
    return { totalItems: 0, oldestDate: null };
  }
}

export async function pruneOldItems(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("publishedAt");
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400 * 1000).toISOString();

    const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    return new Promise((resolve) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    // silently fail
  }
}
