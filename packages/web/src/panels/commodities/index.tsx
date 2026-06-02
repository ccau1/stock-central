import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import ComparisonChart from "../../components/ComparisonChart";

const COMMODITY_SYMBOLS = ["GLD", "USO", "SLV", "DBA"];
const COMMODITY_NAMES: Record<string, string> = {
  GLD: "Gold",
  USO: "Crude Oil",
  SLV: "Silver",
  DBA: "Agriculture",
};

export function CommoditiesPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(COMMODITY_SYMBOLS, "1y"),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const activeSymbols = COMMODITY_SYMBOLS.filter((s) => data && data[s] && data[s].length > 0);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {activeSymbols.map((sym) => {
          const points = data![sym];
          const current = points[points.length - 1].price;
          const start = points[0].price;
          const changePct = start > 0 ? ((current - start) / start) * 100 : 0;
          return (
            <div key={sym} className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
              <div className="text-[10px] text-gray-500 uppercase">{COMMODITY_NAMES[sym]}</div>
              <div className="text-sm font-bold text-gray-800">{current.toFixed(2)}</div>
              <div className={`text-[10px] font-medium ${changePct >= 0 ? "text-green-600" : "text-red-500"}`}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      {data && <ComparisonChart data={data} symbols={activeSymbols} mode="normalized" />}
    </PanelContainer>
  );
}

export const commoditiesPanel: PanelDefinition = {
  id: "commodities",
  name: "Commodities",
  description: "Performance of key commodities — Gold, Oil, Silver, and Agriculture.",
  categories: ["macro"],
  component: CommoditiesPanel,
  filterConfig: { tickerMode: "none" },
};
