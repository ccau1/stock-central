import { useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import FearGreedChartModal from "../../components/FearGreedChartModal";

export function FearGreedPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getFearGreed(),
    [refreshKey]
  );

  const [chartOpen, setChartOpen] = useState(false);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const value = data?.value ?? 50;
  const prev = data?.previous_value ?? 50;
  const label = data?.label ?? "Neutral";
  const rotation = -90 + (value / 100) * 180;
  const colorClass =
    value <= 24 ? "text-red-500" :
    value <= 44 ? "text-orange-500" :
    value <= 55 ? "text-yellow-500" :
    value <= 75 ? "text-lime-500" : "text-green-500";

  const delta = value - prev;
  const deltaPercent = prev !== 0 ? Math.round((delta / prev) * 100) : 0;
  const deltaUp = delta >= 0;
  const deltaColor = deltaUp ? "text-green-600" : "text-red-600";
  const deltaArrow = deltaUp ? "↑" : "↓";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div
        className="flex flex-col items-center justify-center h-full cursor-pointer group relative"
        onClick={() => setChartOpen(true)}
        title="Click to view 12-month history"
      >
        <div className="relative w-full max-w-[140px] aspect-[2/1]">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <path d="M 35 100 A 65 65 0 0 1 52.6 55.5" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="butt" />
            <path d="M 52.6 55.5 A 65 65 0 0 1 87.8 36.2" fill="none" stroke="#f97316" strokeWidth="20" strokeLinecap="butt" />
            <path d="M 87.8 36.2 A 65 65 0 0 1 110.2 35.8" fill="none" stroke="#eab308" strokeWidth="20" strokeLinecap="butt" />
            <path d="M 110.2 35.8 A 65 65 0 0 1 146.0 54.0" fill="none" stroke="#84cc16" strokeWidth="20" strokeLinecap="butt" />
            <path d="M 146.0 54.0 A 65 65 0 0 1 165 100" fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="butt" />
            <line x1="100" y1="100" x2="100" y2="35" stroke="#374151" strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 100 100)`} />
            <circle cx="100" cy="100" r="5" fill="#374151" />
          </svg>
        </div>
        <div className={`text-lg font-bold mt-1 ${colorClass}`}>{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{value}/100</div>
        {data && (
          <div className={`text-xs font-medium mt-1 ${deltaColor}`}>
            {deltaArrow} {Math.abs(delta)} pts ({deltaUp ? "+" : ""}{deltaPercent}%)
            <span className="text-gray-400 font-normal ml-1">vs last week</span>
          </div>
        )}
        {data && <div className="text-[10px] text-gray-300 mt-1">{new Date(data.timestamp).toLocaleTimeString()}</div>}
      </div>
      {chartOpen && (
        <FearGreedChartModal
          open={true}
          onClose={() => setChartOpen(false)}
          currentValue={data?.value}
          currentLabel={data?.label}
        />
      )}
    </PanelContainer>
  );
}

export const fearGreedPanel: PanelDefinition = {
  id: "fear-greed",
  name: "Fear & Greed",
  description: "CNN-style Fear & Greed index gauge. Click for history.",
  categories: ["generic"],
  component: FearGreedPanel,
  filterConfig: { tickerMode: "none" },
};
