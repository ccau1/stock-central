import { TrendingUp, TrendingDown } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { IndexPerformance } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function MacroCardPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const source = inputs.source || "macro";
  const symbol = inputs.symbol || "^VIX";
  const invertColors = inputs.invert_colors === true;

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

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const up = (data?.change ?? 0) >= 0;
  const isTreasury = symbol === "^TNX" || symbol === "^FVX" || symbol === "^TYX";
  const isVix = symbol === "^VIX";

  let upColor = up ? "text-green-600" : "text-red-600";
  let upIcon = up ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  if (invertColors || isVix) {
    upColor = up ? "text-red-600" : "text-green-600";
    upIcon = up ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-green-500" />;
  }
  if (isTreasury) {
    upColor = up ? "text-red-600" : "text-green-600";
  }

  const ytd = (data as IndexPerformance)?.ytd;
  const val = data && "value" in data ? data.value : (data as IndexPerformance)?.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && val !== undefined ? (
        <div className="flex flex-col h-full justify-center">
          <div className="flex items-center justify-between mb-1">
            {upIcon}
          </div>
          <div className="text-2xl font-bold text-gray-900">{val.toLocaleString()}</div>
          <div className={`text-xs font-medium mt-1 ${upColor}`}>
            {up ? "↑" : "↓"} {Math.abs(data.change).toFixed(2)} ({up ? "+" : ""}{data.change_pct.toFixed(2)}%) <span className="text-gray-400 font-normal">5d</span>
          </div>
          {ytd !== undefined && (
            <div className="text-[10px] text-gray-400 mt-1">YTD: {ytd >= 0 ? "+" : ""}{ytd.toFixed(1)}%</div>
          )}
          {isVix && (
            <div className="text-[10px] text-gray-400 mt-1">{val > 30 ? "High fear" : val > 20 ? "Elevated" : "Low / complacent"}</div>
          )}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

export const macroCardPanel: PanelDefinition = {
  id: "macro-card",
  name: "Macro Indicator Card",
  description: "Single macro indicator snapshot. Use panel settings to choose between VIX, unemployment, inflation, or other key indicators.",
  category: "macro",
  component: MacroCardPanel,
  filterConfig: { tickerMode: "none" },
};
