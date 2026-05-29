import { useState, useEffect, useCallback } from "react";

export function useDisabledTickers(storageKey: string) {
  const [disabledTickers, setDisabledTickers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(disabledTickers)));
  }, [disabledTickers, storageKey]);

  const handleTickerClick = useCallback((symbol: string, allTickers: string[]) => {
    setDisabledTickers((prev) => {
      const next = new Set(prev);
      if (next.size === 0) {
        // All visible → isolate to clicked ticker only
        allTickers.forEach((t) => {
          if (t !== symbol) next.add(t);
        });
      } else {
        // Some hidden → toggle this one
        if (next.has(symbol)) next.delete(symbol);
        else next.add(symbol);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => setDisabledTickers(new Set()), []);
  const hideAll = useCallback((allTickers: string[]) => setDisabledTickers(new Set(allTickers)), []);
  const remove = useCallback((symbol: string) => {
    setDisabledTickers((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  const enabledTickers = useCallback(
    (allTickers: string[]) => allTickers.filter((t) => !disabledTickers.has(t)),
    [disabledTickers]
  );

  return {
    disabledTickers,
    setDisabledTickers,
    handleTickerClick,
    showAll,
    hideAll,
    remove,
    enabledTickers,
  };
}
