import { useState, useEffect, useCallback } from "react";

export interface ScanHistoryItem {
  id: string;
  item: string;
  category: "recyclable" | "compostable" | "trash";
  confidence: number;
  location: string;
  timestamp: number;
  imagePreview?: string; // Small thumbnail
}

const STORAGE_KEY = "ecosort-scan-history";
const MAX_HISTORY_ITEMS = 50;

export function useScanHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load scan history:", e);
    }
  }, []);

  // Save to localStorage whenever history changes
  const saveHistory = useCallback((items: ScanHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save scan history:", e);
    }
  }, []);

  const addScan = useCallback((scan: Omit<ScanHistoryItem, "id" | "timestamp">) => {
    setHistory((prev) => {
      // Create small thumbnail if image exists
      let imagePreview = scan.imagePreview;
      if (imagePreview && imagePreview.length > 50000) {
        // If image is too large, skip storing it
        imagePreview = undefined;
      }

      const newItem: ScanHistoryItem = {
        ...scan,
        imagePreview,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addScan, clearHistory };
}
