import { X, Search, RefreshCw, Eye, EyeOff, Trash2, Lock, Unlock } from "lucide-react";
import type { TickerSearchResult } from "../lib/api";

interface TickerFilterBarProps {
  tickers: string[];
  disabledTickers: Set<string>;
  onTickerClick: (symbol: string) => void;
  onRemoveTicker: (symbol: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onClear: () => void;
  onRefreshAll: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: TickerSearchResult[];
  searchLoading: boolean;
  showDropdown: boolean;
  onShowDropdown: (show: boolean) => void;
  onSelectSearchResult: (symbol: string) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  extraControls?: React.ReactNode;
}

export default function TickerFilterBar({
  tickers,
  disabledTickers,
  onTickerClick,
  onRemoveTicker,
  onShowAll,
  onHideAll,
  onClear,
  onRefreshAll,
  isEditMode,
  onToggleEditMode,
  searchQuery,
  onSearchChange,
  searchResults,
  searchLoading,
  showDropdown,
  onShowDropdown,
  onSelectSearchResult,
  searchRef,
  extraControls,
}: TickerFilterBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
        <span className="text-xs text-gray-500 font-medium mr-1">Tickers:</span>
        {tickers.map((t) => {
          const isDisabled = disabledTickers.has(t);
          return (
            <span
              key={t}
              onClick={() => onTickerClick(t)}
              title={isDisabled ? "Click to show" : "Click to toggle visibility"}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded cursor-pointer select-none transition-opacity ${
                isDisabled
                  ? "bg-gray-100 text-gray-400 line-through opacity-60"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {t}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTicker(t);
                }}
                className={isDisabled ? "hover:text-gray-600" : "hover:text-blue-900"}
                title="Remove"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
        {tickers.length > 0 && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={onShowAll}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-white rounded hover:bg-gray-100"
              title="Show all"
            >
              <Eye size={10} />
              All
            </button>
            <button
              onClick={onHideAll}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-white rounded hover:bg-gray-100"
              title="Hide all"
            >
              <EyeOff size={10} />
              All
            </button>
            <button
              onClick={onClear}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
              title="Clear all tickers"
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>
        )}

        {/* Search input with dropdown */}
        <div ref={searchRef} className="relative ml-1">
          <div className="flex items-center">
            <Search size={10} className="text-gray-400 mr-1" />
            <input
              className="w-24 bg-transparent text-xs focus:outline-none placeholder:text-gray-300"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
              onFocus={() => {
                if (searchResults.length > 0) onShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  onSelectSearchResult(searchResults[0].symbol);
                }
                if (e.key === "Backspace" && searchQuery === "" && tickers.length > 0) {
                  onRemoveTicker(tickers[tickers.length - 1]);
                }
              }}
            />
            {searchLoading && (
              <RefreshCw size={10} className="text-gray-400 animate-spin ml-1" />
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => onSelectSearchResult(r.symbol)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{r.symbol}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{r.name}</div>
                  </div>
                  <div className="text-[10px] text-gray-400">{r.exchange}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {extraControls}

        {/* Edit mode toggle */}
        <button
          onClick={onToggleEditMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isEditMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={isEditMode ? "Disable edit mode" : "Enable edit mode"}
        >
          {isEditMode ? <Unlock size={12} /> : <Lock size={12} />}
          {isEditMode ? "Edit On" : "Edit Off"}
        </button>

        {/* Global Refresh */}
        <button
          onClick={onRefreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw size={12} />
          Refresh All
        </button>
      </div>
    </header>
  );
}
