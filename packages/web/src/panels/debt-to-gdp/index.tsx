import { useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

const COUNTRY_OPTIONS = [
  { code: "USA", name: "🇺🇸 United States" },
  { code: "JPN", name: "🇯🇵 Japan" },
  { code: "GBR", name: "🇬🇧 United Kingdom" },
  { code: "FRA", name: "🇫🇷 France" },
  { code: "ITA", name: "🇮🇹 Italy" },
  { code: "DEU", name: "🇩🇪 Germany" },
  { code: "CAN", name: "🇨🇦 Canada" },
  { code: "AUS", name: "🇦🇺 Australia" },
  { code: "BRA", name: "🇧🇷 Brazil" },
  { code: "IND", name: "🇮🇳 India" },
  { code: "CHN", name: "🇨🇳 China" },
  { code: "KOR", name: "🇰🇷 South Korea" },
  { code: "MEX", name: "🇲🇽 Mexico" },
  { code: "ESP", name: "🇪🇸 Spain" },
  { code: "IRL", name: "🇮🇪 Ireland" },
  { code: "PRT", name: "🇵🇹 Portugal" },
  { code: "GRC", name: "🇬🇷 Greece" },
];

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;

  const width = 300;
  const height = 90;
  const pad = { top: 5, right: 5, bottom: 20, left: 30 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxValue = Math.max(...data.map((d) => d.value));
  const yMax = Math.ceil(maxValue / 50) * 50 || 100;
  const barWidth = (chartW / data.length) * 0.7;
  const gap = (chartW / data.length) * 0.3;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {[0, 1, 2].map((i) => {
        const y = pad.top + (i / 2) * chartH;
        const val = yMax - (i / 2) * yMax;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={pad.left - 3} y={y + 3} textAnchor="end" fontSize="7" fill="#9ca3af">
              {val.toFixed(0)}%
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = (d.value / yMax) * chartH;
        const x = pad.left + i * (barWidth + gap) + gap / 2;
        const y = pad.top + chartH - barH;
        const isCurrent = i === data.length - 1;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={barH} rx="1" fill={isCurrent ? "#3b82f6" : "#93c5fd"} />
            <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fontSize="7" fill="#6b7280">
              {d.label.slice(-2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DebtToGdpPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const [country, setCountry] = useState("USA");
  const { data, loading, error } = usePanelData(
    () => dataApi.getDebtToGdp(country),
    [refreshKey, country]
  );

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  const chartData = data?.history.map((d) => ({ label: d.year, value: d.value })) || [];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 mt-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {data?.source && <span className="text-[9px] text-gray-400">{data.source}</span>}
        </div>

        {data && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-800">{data.current.toFixed(1)}%</span>
              <span className="text-xs text-gray-500 mb-1">of GDP ({data.current_year})</span>
            </div>
            <div className="flex-1 min-h-0">
              <BarChart data={chartData} />
            </div>
          </div>
        )}

        {!data && !error && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400">
            No data available
          </div>
        )}
      </div>
    </PanelContainer>
  );
}

export const debtToGdpPanel: PanelDefinition = {
  id: "debt-to-gdp",
  name: "Debt-to-GDP Ratio",
  description: "General government gross debt as a percentage of GDP by country. Higher ratios indicate heavier sovereign debt burdens relative to economic output.",
  categories: ["macro"],
  component: DebtToGdpPanel,
  filterConfig: { tickerMode: "none" },
};
