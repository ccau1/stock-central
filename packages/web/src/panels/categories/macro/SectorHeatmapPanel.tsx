import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, colorForChangePct, usePanelData } from "../../core";

const SECTOR_ETFS = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLV", name: "Health Care" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "XLC", name: "Communication" },
];

export function SectorHeatmapPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    async () => {
      const sectorSymbols = SECTOR_ETFS.map((s) => s.symbol);
      const ytdData = await dataApi.getYtd(sectorSymbols);
      return SECTOR_ETFS.map((s) => {
        const d = ytdData.find((x: any) => x.symbol === s.symbol);
        return {
          symbol: s.symbol,
          name: s.name,
          price: 0,
          change: 0,
          change_pct: 0,
          ytd: d?.ytd ?? 0,
        };
      });
    },
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {data.map((s: any) => (
            <Link
              key={s.symbol}
              to={`/ticker/${s.symbol}`}
              className={`rounded-lg p-3 flex flex-col items-center justify-center text-center ${colorForChangePct(s.ytd)} hover:brightness-105 transition-all`}
            >
              <div className="text-[10px] font-medium opacity-90">{s.name}</div>
              <div className="text-sm font-bold my-0.5">{s.symbol}</div>
              <div className="text-[10px] font-medium opacity-90">{s.ytd >= 0 ? "+" : ""}{s.ytd.toFixed(1)}%</div>
            </Link>
          ))}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

export const sectorHeatmapPanel: PanelDefinition = {
  id: "sector-heatmap",
  name: "Sector Heatmap",
  description: "Sector ETF year-to-date performance. Shows which parts of the market are leading or lagging.",
  category: "macro",
  component: SectorHeatmapPanel,
  filterConfig: { tickerMode: "none" },
};
