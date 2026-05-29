import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { MacroIndicator, IndexPerformance } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function MacroCardGridPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const symbols: string[] = inputs.symbols || ["^TNX", "^FVX", "^DJI", "^IXIC"];

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

  if (loading && !macroData) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const allData = [...(macroData?.macro || []), ...(macroData?.index || [])];
  const filtered = symbols.map((sym) => allData.find((d) => d.symbol === sym)).filter(Boolean) as (MacroIndicator | IndexPerformance)[];

  const getValue = (d: MacroIndicator | IndexPerformance) => "value" in d ? d.value : d.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {filtered.map((m) => {
          const up = m.change >= 0;
          const isTreasury = m.symbol === "^TNX" || m.symbol === "^FVX";
          const upColor = isTreasury ? (up ? "text-red-600" : "text-green-600") : (up ? "text-green-600" : "text-red-600");
          return (
            <div key={m.symbol} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium">{m.name}</div>
              <div className="text-sm font-bold text-gray-900">{getValue(m).toFixed(2)}</div>
              <div className={`text-[10px] font-medium ${upColor}`}>
                {up ? "↑" : "↓"} {Math.abs(m.change).toFixed(2)} ({up ? "+" : ""}{m.change_pct.toFixed(2)}%)
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

export const macroCardGridPanel: PanelDefinition = {
  id: "macro-card-grid",
  name: "Macro Indicator Grid",
  description: "Overview grid of major macro indicators including VIX, unemployment, inflation, and index performance.",
  category: "macro",
  component: MacroCardGridPanel,
  filterConfig: { tickerMode: "none" },
};
