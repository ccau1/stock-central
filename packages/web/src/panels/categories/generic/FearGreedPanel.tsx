import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function FearGreedPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getFearGreed(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const value = data?.value ?? 50;
  const prev = data?.previous_value ?? 50;
  const label = data?.label ?? "Neutral";
  const rotation = -90 + (value / 100) * 180;
  const colorClass =
    value <= 20 ? "text-red-600" :
    value <= 40 ? "text-orange-600" :
    value <= 60 ? "text-yellow-600" :
    value <= 80 ? "text-lime-600" : "text-green-600";

  const delta = value - prev;
  const deltaPercent = prev !== 0 ? Math.round((delta / prev) * 100) : 0;
  const deltaUp = delta >= 0;
  const deltaColor = deltaUp ? "text-green-600" : "text-red-600";
  const deltaArrow = deltaUp ? "↑" : "↓";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative w-full max-w-[180px] aspect-[2/1]">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round" />
            <path d="M 20 100 A 80 80 0 0 1 80 35" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
            <path d="M 80 35 A 80 80 0 0 1 120 35" fill="none" stroke="#eab308" strokeWidth="20" strokeLinecap="round" />
            <path d="M 120 35 A 80 80 0 0 1 180 100" fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
            <line x1="100" y1="100" x2="100" y2="30" stroke="#374151" strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 100 100)`} />
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
    </PanelContainer>
  );
}

export const fearGreedPanel: PanelDefinition = {
  id: "fear-greed",
  name: "Fear & Greed",
  description: "CNN-style Fear & Greed index gauge.",
  category: "generic",
  component: FearGreedPanel,
  filterConfig: { tickerMode: "none" },
};
