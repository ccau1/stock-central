import { useState, useEffect, useCallback } from "react";

export function usePersistentTickers(key: string, defaults: string[]) {
  const [tickers, setTickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(tickers));
  }, [tickers, key]);

  const addTicker = useCallback(
    (ticker: string) => {
      const t = ticker.trim().toUpperCase();
      setTickers((prev) => {
        if (prev.includes(t)) return prev;
        return [...prev, t];
      });
    },
    []
  );

  const removeTicker = useCallback(
    (ticker: string) => {
      setTickers((prev) => prev.filter((t) => t !== ticker));
    },
    []
  );

  return { tickers, setTickers, addTicker, removeTicker };
}
