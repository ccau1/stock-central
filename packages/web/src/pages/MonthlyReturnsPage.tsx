import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { MonthlyReturnsTable } from "../components/MonthlyReturnsTable";

export default function MonthlyReturnsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") || "SPY").toUpperCase();
  const [symbol, setSymbol] = useState(initialSymbol);

  // Sync URL query when symbol changes.
  useEffect(() => {
    if (symbol && symbol !== "SPY") {
      setSearchParams({ symbol });
    } else {
      setSearchParams({});
    }
  }, [symbol, setSearchParams]);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showDropdown,
    searchRef,
    handleSelect,
    handleKeyDown,
    setShowDropdown,
  } = useTickerSearch({
    onSelect: (sym: string) => {
      setSymbol(sym);
    },
  });

  const title = symbol ? `${symbol} Total Percent Returns` : "Total Percent Returns";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 w-56">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                className="bg-transparent text-xs focus:outline-none placeholder:text-gray-400 w-full"
                placeholder="Change ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
              />
              {searchLoading && <RefreshCw size={12} className="text-gray-400 animate-spin shrink-0" />}
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-72 overflow-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelect(r.symbol)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{r.symbol}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{r.name}</div>
                    </div>
                    <div className="text-[10px] text-gray-400">{r.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <MonthlyReturnsTable symbol={symbol} />
      </div>
    </div>
  );
}
