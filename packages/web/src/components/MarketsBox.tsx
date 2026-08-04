import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, X } from "lucide-react";
import CollapsibleBox from "./CollapsibleBox";
import MiniCandleChart from "./MiniCandleChart";

interface MarketIndex {
  symbol: string;
  name: string;
}

interface CountryMarket {
  id: string;
  name: string;
  flag: string;
  indexes: MarketIndex[];
}

const MARKETS: CountryMarket[] = [
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    indexes: [
      { symbol: "^GSPC", name: "S&P 500" },
      { symbol: "^IXIC", name: "Nasdaq Composite" },
      { symbol: "^DJI", name: "Dow Jones" },
      { symbol: "^NDX", name: "Nasdaq 100" },
      { symbol: "^RUT", name: "Russell 2000" },
    ],
  },
  {
    id: "europe",
    name: "Europe",
    flag: "🇪🇺",
    indexes: [
      { symbol: "^FTSE", name: "FTSE 100" },
      { symbol: "^GDAXI", name: "DAX" },
      { symbol: "^FCHI", name: "CAC 40" },
      { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
      { symbol: "^IBEX", name: "IBEX 35" },
    ],
  },
  {
    id: "asia",
    name: "Asia",
    flag: "🌏",
    indexes: [
      { symbol: "^N225", name: "Nikkei 225" },
      { symbol: "^HSI", name: "Hang Seng" },
      { symbol: "000001.SS", name: "Shanghai Comp" },
      { symbol: "^BSESN", name: "BSE Sensex" },
      { symbol: "^KS11", name: "KOSPI" },
    ],
  },
  {
    id: "americas",
    name: "Americas",
    flag: "🌎",
    indexes: [
      { symbol: "^GSPTSE", name: "TSX Composite" },
      { symbol: "^BVSP", name: "Bovespa" },
      { symbol: "^MXX", name: "IPC Mexico" },
    ],
  },
  {
    id: "pacific",
    name: "Pacific",
    flag: "🌏",
    indexes: [
      { symbol: "^AXJO", name: "S&P/ASX 200" },
    ],
  },
];

function getInitialCountry(): string {
  return "us";
}

function getInitialDesktopOpen(): boolean {
  try {
    const raw = localStorage.getItem("stockcentral_markets_open");
    if (raw !== null) return raw === "true";
  } catch {
    // ignore
  }
  return true;
}

function MarketContent({
  countryId,
  indexSymbol,
  onSelectCountry,
  onSelectIndex,
}: {
  countryId: string;
  indexSymbol: string;
  onSelectCountry: (id: string) => void;
  onSelectIndex: (symbol: string) => void;
}) {
  const country = useMemo(
    () => MARKETS.find((m) => m.id === countryId) || MARKETS[0],
    [countryId]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Country tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectCountry(m.id)}
            className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              m.id === countryId
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className="mr-1">{m.flag}</span>
            {m.name}
          </button>
        ))}
      </div>

      {/* Index tabs */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-gray-50 overflow-x-auto">
        {country.indexes.map((idx) => (
          <button
            key={idx.symbol}
            onClick={() => onSelectIndex(idx.symbol)}
            className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
              idx.symbol === indexSymbol
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {idx.name}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[220px]">
        <MiniCandleChart symbol={indexSymbol} />
      </div>
    </div>
  );
}

interface MarketsBoxProps {
  variant?: "full" | "desktop" | "mobile";
}

export default function MarketsBox({ variant = "full" }: MarketsBoxProps) {
  const [countryId, setCountryId] = useState(() => getInitialCountry());
  const [indexSymbol, setIndexSymbol] = useState<string>(MARKETS[0].indexes[0].symbol);
  const [, setDesktopOpen] = useState(() => getInitialDesktopOpen());

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAnimating, setMobileAnimating] = useState(false);

  const handleSelectCountry = (id: string) => {
    setCountryId(id);
    const country = MARKETS.find((m) => m.id === id);
    if (country) {
      setIndexSymbol(country.indexes[0].symbol);
    }
  };

  const content = (
    <MarketContent
      countryId={countryId}
      indexSymbol={indexSymbol}
      onSelectCountry={handleSelectCountry}
      onSelectIndex={setIndexSymbol}
    />
  );

  const renderDesktop = variant === "full" || variant === "desktop";
  const renderMobile = variant === "full" || variant === "mobile";

  return (
    <>
      {renderDesktop && (
        <div className={variant === "desktop" ? "" : "hidden sm:block"}>
          <CollapsibleBox
            title="Markets"
            defaultOpen={true}
            storageKey="stockcentral_markets_open"
            onToggle={setDesktopOpen}
            width={360}
            maxHeight={460}
          >
            {content}
          </CollapsibleBox>
        </div>
      )}

      {renderMobile && (
        <div className={variant === "mobile" ? "" : "block sm:hidden shrink-0"}>
          <button
            onClick={() => {
              setMobileOpen(true);
              requestAnimationFrame(() => setMobileAnimating(true));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-[11px] font-medium whitespace-nowrap"
          >
            <Globe size={12} />
            Markets
          </button>
        </div>
      )}

      {renderMobile && mobileOpen &&
        createPortal(
          <div
            className={`fixed inset-0 z-[60] flex items-end justify-center sm:hidden transition-colors duration-300 ${
              mobileAnimating ? "bg-black/40" : "bg-black/0"
            }`}
            onClick={() => {
              setMobileAnimating(false);
              setTimeout(() => setMobileOpen(false), 300);
            }}
          >
            <div
              className={`bg-white rounded-t-xl shadow-xl w-full max-h-[80vh] flex flex-col transition-transform duration-300 ease-out ${
                mobileAnimating ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Markets</h3>
                <button
                  onClick={() => {
                    setMobileAnimating(false);
                    setTimeout(() => setMobileOpen(false), 300);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">{content}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
