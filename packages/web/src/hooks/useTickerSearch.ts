import { useState, useEffect, useRef } from "react";
import { dataApi } from "../lib/api";
import type { TickerSearchResult } from "../lib/api";

export interface UseTickerSearchOptions {
  existingTickers?: string[];
  onSelect: (symbol: string) => void;
}

export function useTickerSearch({ existingTickers, onSelect }: UseTickerSearchOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(() => {
      dataApi.searchTickers(q)
        .then((results) => {
          const existing = existingTickers ?? [];
          const filtered = results.filter((r: TickerSearchResult) => !existing.includes(r.symbol));
          setSearchResults(filtered.slice(0, 8));
          setShowDropdown(filtered.length > 0);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setShowDropdown(false);
          setSearchLoading(false);
        });
    }, 200);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, existingTickers]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSelect(searchResults[0].symbol);
    }
    if (e.key === "Backspace" && searchQuery === "" && (existingTickers?.length ?? 0) > 0) {
      // Let consumer handle backspace removal if needed
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showDropdown,
    setShowDropdown,
    searchRef,
    handleSelect,
    handleKeyDown,
  };
}
