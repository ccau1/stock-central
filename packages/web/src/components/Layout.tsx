import { useRef, useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Globe, GitCompare, BarChart3, LayoutGrid, LayoutDashboard, Search, RefreshCw, Filter, Layers, CalendarDays, Star, Briefcase, Home, Table, Calculator, ChevronDown } from "lucide-react";
import { useTickerSearch } from "../hooks/useTickerSearch";
import BottomRightDock from "./BottomRightDock";
import RealTimeNewsBox from "./RealTimeNewsBox";

interface NavLink {
  type: "link";
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  type: "group";
  label: string;
  icon: React.ElementType;
  children: { path: string; label: string }[];
}

type NavItem = NavLink | NavGroup;

const navItems: NavItem[] = [
  { type: "link", path: "/", label: "Overview", icon: Globe },
  { type: "link", path: "/heatmap", label: "Heatmap", icon: LayoutGrid },
  { type: "link", path: "/rrg", label: "RRG", icon: BarChart3 },
  { type: "link", path: "/comparisons", label: "Comparisons", icon: GitCompare },
  { type: "link", path: "/screener", label: "Screener", icon: Filter },
  { type: "link", path: "/sector-rotation", label: "Sectors", icon: Layers },
  { type: "link", path: "/earnings", label: "Earnings", icon: CalendarDays },
  { type: "link", path: "/watchlist", label: "Watchlist", icon: Star },
  { type: "link", path: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { type: "link", path: "/portfolio", label: "Portfolio", icon: Briefcase },
  { type: "link", path: "/real-estate-us", label: "Real Estate", icon: Home },
  { type: "link", path: "/monthly-returns", label: "Monthly Returns", icon: Table },
  {
    type: "group",
    label: "Calculators",
    icon: Calculator,
    children: [
      { path: "/calculators/compound-calculator", label: "Compound Calculator" },
      { path: "/calculators/mortgage-calculator", label: "Mortgage Calculator" },
    ],
  },
];

function NavDropdown({ item, active }: { item: NavGroup; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
          active
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <item.icon size={14} />
        <span className="hidden sm:inline">{item.label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="fixed w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <Link
            to="/"
            className="flex items-center gap-2 mr-2 sm:mr-6 shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800 hidden sm:inline">StockCentral</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto thin-scrollbar">
            {navItems.map((item) => {
              if (item.type === "group") {
                const active = item.children.some((child) =>
                  location.pathname === child.path
                );
                return <NavDropdown key={item.label} item={item} active={active} />;
              }

              const active =
                item.path === "/dashboards"
                  ? location.pathname.startsWith("/dashboard")
                  : location.pathname === item.path;
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
      <main className="flex-1 overflow-auto pb-12 sm:pb-0">
        <Outlet />
      </main>

      <BottomRightDock>
        <RealTimeNewsBox />
      </BottomRightDock>
    </div>
  );
}
