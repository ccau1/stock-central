import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, colorForChangePct, usePanelData } from "../../core";

export function AssetClassGridPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getAssetClasses(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {data.map((ac: any) => (
            <div key={ac.symbol} className={`rounded-lg p-2 flex flex-col text-center ${colorForChangePct(ac.ytd)}`}>
              <div className="text-[10px] font-medium opacity-90 truncate">{ac.name}</div>
              <div className="text-xs font-bold my-0.5">{ac.symbol}</div>
              <div className="text-[10px] opacity-90">YTD {ac.ytd >= 0 ? "+" : ""}{ac.ytd.toFixed(1)}%</div>
              <div className="text-[9px] opacity-75 mt-0.5">1M {ac.change_1m >= 0 ? "+" : ""}{ac.change_1m.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

export const assetClassGridPanel: PanelDefinition = {
  id: "asset-class-grid",
  name: "Asset Class Grid",
  description: "Performance heatmap across major asset classes including equities, bonds, commodities, and real estate.",
  category: "macro",
  component: AssetClassGridPanel,
  filterConfig: { tickerMode: "none" },
};
