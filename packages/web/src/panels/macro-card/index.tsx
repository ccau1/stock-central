import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { IndexPerformance } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import MacroIndicatorChartModal from "../../components/MacroIndicatorChartModal";

export function MacroCardPanel({ title, inputs, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const source = inputs.source || "macro";
  const symbol = inputs.symbol || "^VIX";
  const invertColors = inputs.invert_colors === true;
  const chartRange = inputs.chart_range || "6mo";

  const [chartOpen, setChartOpen] = useState(false);

  const { data, loading, error } = usePanelData(
    async () => {
      if (source === "macro") {
        const arr = await dataApi.getMacro();
        return arr.find((m) => m.symbol === symbol) ?? null;
      }
      const arr = await dataApi.getIndexPerformance();
      return arr.find((m) => m.symbol === symbol) ?? null;
    },
    [refreshKey, source, symbol]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const up = (data?.change ?? 0) >= 0;
  const isVix = symbol === "^VIX";
  const isTreasury = symbol === "^TNX" || symbol === "^FVX" || symbol === "^TYX";

  let upColor = up ? "text-green-600" : "text-red-600";
  let upIcon = up ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  if (invertColors || isVix) {
    upColor = up ? "text-red-600" : "text-green-600";
    upIcon = up ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-green-500" />;
  }

  const ytd = (data as IndexPerformance)?.ytd;
  const val = data && "value" in data ? data.value : (data as IndexPerformance)?.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && val !== undefined ? (
        <div
          className="flex flex-col h-full justify-center cursor-pointer group"
          onClick={() => setChartOpen(true)}
          title="Click to view daily chart"
        >
          <div className="flex items-center justify-between mb-1">
            {upIcon}
          </div>
          <div className="text-2xl font-bold text-gray-900">{val.toLocaleString()}{isTreasury ? "%" : ""}</div>
          <div className={`text-xs font-medium mt-1 ${upColor}`}>
            {up ? "↑" : "↓"} {Math.abs(data.change).toFixed(2)} ({up ? "+" : ""}{data.change_pct.toFixed(2)}%) <span className="text-gray-400 font-normal">5d</span>
          </div>
          {ytd !== undefined && (
            <div className="text-[10px] text-gray-400 mt-1">YTD: {ytd >= 0 ? "+" : ""}{ytd.toFixed(1)}%</div>
          )}
          {isVix && (
            <div className="text-[10px] text-gray-400 mt-1">{val > 30 ? "High fear" : val > 20 ? "Elevated" : "Low / complacent"}</div>
          )}
          <div className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Click for daily chart</div>
        </div>
      ) : (
        <PanelLoading />
      )}
      {chartOpen && (
        <MacroIndicatorChartModal
          symbol={symbol}
          title={title || data?.name || symbol}
          open={true}
          onClose={() => setChartOpen(false)}
          range={chartRange}
        />
      )}
    </PanelContainer>
  );
}

export const macroCardPanel: PanelDefinition = {
  id: "macro-card",
  name: "Macro Indicator Card",
  description: "Single macro or index indicator snapshot. Choose from VIX, S&P 500, 10Y Treasury yield, unemployment, inflation, and other key indicators. Click the card to open a daily chart.",
  categories: ["macro"],
  component: MacroCardPanel,
  filterConfig: { tickerMode: "none" },
};
