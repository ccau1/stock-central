import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import ComparisonChart from "../../components/ComparisonChart";

const RATE_SYMBOLS = ["^IRX", "^FVX", "^TNX", "^TYX"];
const RATE_NAMES: Record<string, string> = {
  "^IRX": "3-Month",
  "^FVX": "5-Year",
  "^TNX": "10-Year",
  "^TYX": "30-Year",
};

export function InterestRatesPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(RATE_SYMBOLS, "1y"),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const activeSymbols = RATE_SYMBOLS.filter((s) => data && data[s] && data[s].length > 0);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {activeSymbols.map((sym) => {
          const points = data![sym];
          const current = points[points.length - 1].price;
          const prev = points.length > 1 ? points[points.length - 2].price : current;
          const change = current - prev;
          return (
            <div key={sym} className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
              <div className="text-[10px] text-gray-500 uppercase">{RATE_NAMES[sym]}</div>
              <div className="text-sm font-bold text-gray-800">{current.toFixed(2)}%</div>
              <div className={`text-[10px] font-medium ${change >= 0 ? "text-red-500" : "text-green-600"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      {data && <ComparisonChart data={data} symbols={activeSymbols} mode="price" />}
    </PanelContainer>
  );
}

export const interestRatesPanel: PanelDefinition = {
  id: "interest-rates",
  name: "Interest Rates",
  description: "US Treasury yields across the curve — 3-month, 5-year, 10-year, and 30-year.",
  categories: ["macro"],
  component: InterestRatesPanel,
  filterConfig: { tickerMode: "none" },
};
