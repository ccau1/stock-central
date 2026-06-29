import { useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { MacroIndicator, IndexPerformance } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import MacroIndicatorChartModal from "../../components/MacroIndicatorChartModal";

export function MacroCardGridPanel({ title, inputs, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const symbols: string[] = inputs.symbols || ["^TNX", "^FVX", "^DJI", "^IXIC"];
  const chartRange = inputs.chart_range || "6mo";

  const [chartSymbol, setChartSymbol] = useState<{ symbol: string; name: string } | null>(null);

  const { data: macroData, loading, error } = usePanelData(
    async () => {
      const [m, idx] = await Promise.all([
        dataApi.getMacro(),
        dataApi.getIndexPerformance(),
      ]);
      return { macro: m, index: idx };
    },
    [refreshKey]
  );

  if (loading && !macroData) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const allData = [...(macroData?.macro || []), ...(macroData?.index || [])];
  const filtered = symbols.map((sym) => allData.find((d) => d.symbol === sym)).filter(Boolean) as (MacroIndicator | IndexPerformance)[];

  const getValue = (d: MacroIndicator | IndexPerformance) => "value" in d ? d.value : d.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {filtered.map((m) => {
          const up = m.change >= 0;
          const isTreasury = m.symbol === "^TNX" || m.symbol === "^FVX" || m.symbol === "^TYX";
          const upColor = up ? "text-green-600" : "text-red-600";
          return (
            <div
              key={m.symbol}
              className="bg-gray-50 rounded-lg p-2 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setChartSymbol({ symbol: m.symbol, name: m.name })}
              title="Click to view daily chart"
            >
              <div className="text-[10px] text-gray-500 font-medium">{m.name}</div>
              <div className="text-sm font-bold text-gray-900">{getValue(m).toFixed(2)}{isTreasury ? "%" : ""}</div>
              <div className={`text-[10px] font-medium ${upColor}`}>
                {up ? "↑" : "↓"} {Math.abs(m.change).toFixed(2)} ({up ? "+" : ""}{m.change_pct.toFixed(2)}%)
              </div>
            </div>
          );
        })}
        {chartSymbol && (
          <MacroIndicatorChartModal
            symbol={chartSymbol.symbol}
            title={chartSymbol.name}
            open={true}
            onClose={() => setChartSymbol(null)}
            range={chartRange}
          />
        )}
      </div>
    </PanelContainer>
  );
}

export const macroCardGridPanel: PanelDefinition = {
  id: "macro-card-grid",
  name: "Macro Indicator Grid",
  description: "Overview grid of major macro indicators including VIX, Treasury yields, unemployment, inflation, and index performance. Click any card to view its daily chart.",
  categories: ["macro"],
  component: MacroCardGridPanel,
  filterConfig: { tickerMode: "none" },
};
