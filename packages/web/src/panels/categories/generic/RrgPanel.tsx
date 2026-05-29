import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

const RRG_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const RRG_GROUPS: { label: string; tickers: string[] }[] = [
  { label: "Sectors", tickers: ["XLK", "XLF", "XLE", "XLI", "XLP", "XLU", "XLV", "XLB", "XLRE", "XLC", "SPY"] },
  { label: "AI + Software", tickers: ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "AMD", "CRM", "ADBE", "ORCL", "PLTR", "PANW"] },
  { label: "Commodities", tickers: ["USO", "UNG", "GLD", "SLV", "PPLT", "CPER", "DBB", "DBC", "GDX", "XLE", "BNO"] },
  { label: "Big Tech", tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"] },
  { label: "Financials", tickers: ["JPM", "BAC", "GS", "MS", "WFC", "C", "BLK", "BX", "SPY"] },
  { label: "China Tech", tickers: ["BABA", "JD", "PDD", "TCEHY", "NTES", "BIDU", "NIO", "LI", "XPEV"] },
];

export function RrgPanel({ title, tickers, enabledTickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const benchmark = inputs.benchmark || "SPY";
  const lookback = inputs.lookback || "3m";

  const [trailLength, setTrailLength] = useState(inputs.trail_length || inputs.trailLength || 2);
  const [group, setGroup] = useState<string | null>(inputs.group || null);

  const symbols = useMemo(() => {
    if (group) {
      const found = RRG_GROUPS.find((g) => g.label === group);
      if (found) return found.tickers;
    }
    return enabledTickers ?? tickers ?? [];
  }, [group, tickers, enabledTickers]);

  const { data, loading, error } = usePanelData(
    () => dataApi.getRrg(symbols, benchmark, lookback, trailLength),
    [symbols, benchmark, lookback, trailLength, refreshKey]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 200, h: 200 });

  useLayoutEffect(() => {
    if (!chartRef.current) return;
    const el = chartRef.current;

    // Immediate measurement in case RO hasn't fired yet
    setChartSize({ w: el.clientWidth, h: el.clientHeight });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const { w, h } = chartSize;
  const s = Math.min(w, h) / 200;
  const cx = w / 2;
  const cy = h / 2;
  const pad = 10 * s;

  const sx = (rs: number) => pad + (rs / 100) * (w - 2 * pad);
  const sy = (rm: number) => h - pad - (rm / 100) * (h - 2 * pad);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      <div className="flex flex-col h-full">
        {error && <PanelError message={error} />}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] text-gray-400">{benchmark} · {lookback}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Trail:</span>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={trailLength}
              onChange={(e) => setTrailLength(Number(e.target.value))}
              className="w-16 h-1 accent-gray-900 cursor-pointer"
            />
            <span className="text-[10px] font-medium text-gray-700 w-4 text-right">{trailLength}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Group:</span>
            <select
              className="text-[10px] bg-transparent focus:outline-none"
              value={group ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setGroup(val || null);
              }}
            >
              <option value="">Custom</option>
              {RRG_GROUPS.map((g) => (
                <option key={g.label} value={g.label}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div ref={chartRef} className="flex-1 relative min-h-0 overflow-hidden max-md:min-h-[200px]">
          <svg width={w} height={h} style={{ display: "block" }}>
            {/* Quadrant backgrounds */}
            <rect x={cx} y={0} width={cx} height={cy} fill="#dcfce7" opacity="0.5" />
            <rect x={cx} y={cy} width={cx} height={cy} fill="#fef3c7" opacity="0.5" />
            <rect x={0} y={cy} width={cx} height={cy} fill="#fee2e2" opacity="0.5" />
            <rect x={0} y={0} width={cx} height={cy} fill="#dbeafe" opacity="0.5" />
            {/* Axes */}
            <line x1={cx} y1={pad} x2={cx} y2={h - pad} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />
            <line x1={pad} y1={cy} x2={w - pad} y2={cy} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />
            {/* Quadrant Labels */}
            <text x={w * 0.75} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#166534" fontWeight="600">Leading</text>
            <text x={w * 0.75} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#92400e" fontWeight="600">Weakening</text>
            <text x={w * 0.25} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#991b1b" fontWeight="600">Lagging</text>
            <text x={w * 0.25} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#1e40af" fontWeight="600">Improving</text>

            {data?.filter((trail: any) => !enabledTickers || enabledTickers.includes(trail.symbol)).map((trail: any, idx: number) => {
              const color = RRG_COLORS[idx % RRG_COLORS.length];
              const points = trail.points;
              if (points.length === 0) return null;

              const pathD = points.map((p: any, i: number) => {
                return `${i === 0 ? "M" : "L"} ${sx(p.rs)} ${sy(p.rm)}`;
              }).join(" ");

              const current = points[points.length - 1];
              const curX = sx(current.rs);
              const curY = sy(current.rm);

              return (
                <g key={trail.symbol}>
                  {points.length > 1 && (
                    <path d={pathD} fill="none" stroke={color} strokeWidth={1.2 * s} opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {points.slice(0, -1).map((p: any, i: number) => (
                    <circle key={i} cx={sx(p.rs)} cy={sy(p.rm)} r={1.5 * s} fill={color} opacity={0.3 + (i / points.length) * 0.4} />
                  ))}
                  <circle cx={curX} cy={curY} r={4 * s} fill={color} opacity="0.9" stroke="white" strokeWidth={0.5 * s} />
                  {(() => {
                    const nearRight = curX > w - pad - (w - 2 * pad) * 0.08;
                    const nearTop = curY < pad + (h - 2 * pad) * 0.08;
                    const nearBottom = curY > h - pad - (h - 2 * pad) * 0.08;
                    return (
                      <text
                        x={nearRight ? curX - 5 * s : curX + 5 * s}
                        y={nearTop ? curY + 12 * s : nearBottom ? curY - 6 * s : curY + 3 * s}
                        textAnchor={nearRight ? "end" : "start"}
                        fontSize={7 * s}
                        fill="#1f2937"
                        fontWeight="500"
                      >
                        {trail.symbol}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </PanelContainer>
  );
}

export const rrgPanel: PanelDefinition = {
  id: "rrg",
  name: "Relative Rotation Graph",
  description: "RRG showing relative momentum vs relative strength.",
  category: "generic",
  component: RrgPanel,
  filterConfig: { tickerMode: "enabled" },
};
