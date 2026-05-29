import { useRef, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Globe, GitCompare, BarChart3, LayoutGrid, LayoutDashboard, Search, RefreshCw } from "lucide-react";
import { useTickerSearch } from "../hooks/useTickerSearch";

const navItems = [
  { path: "/", label: "Overview", icon: Globe },
  { path: "/heatmap", label: "Heatmap", icon: LayoutGrid },
  { path: "/rrg", label: "RRG", icon: BarChart3 },
  { path: "/comparisons", label: "Comparisons", icon: GitCompare },
  { path: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
];

function HeaderSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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
    onSelect: (symbol: string) => {
      navigate(`/ticker/${symbol}`);
    },
  });

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={searchRef} className="relative">
      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 w-40 sm:w-56">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          className="bg-transparent text-xs focus:outline-none placeholder:text-gray-400 w-full"
          placeholder="Search ticker..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {searchLoading && <RefreshCw size={12} className="text-gray-400 animate-spin shrink-0" />}
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-72 overflow-auto">
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
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <nav className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2 mr-2 sm:mr-6 shrink-0">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800 hidden sm:inline">StockCentral</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={14} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1 min-w-2" />
          <HeaderSearch />
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
