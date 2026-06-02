import { useEffect, useState } from "react";

export interface PanelDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function usePanelData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList
): PanelDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
}
