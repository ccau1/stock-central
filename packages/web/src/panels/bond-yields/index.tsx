import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi, type BondYieldPoint } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { useSvgContainerSize } from "../../hooks/useSvgContainerSize";

const MATURITY_LABELS: Record<string, string> = {
  "3m": "3M",
  "2y": "2Y",
  "5y": "5Y",
  "10y": "10Y",
  "30y": "30Y",
};

const US_COLORS: Record<string, string> = {
  "3m": "#93c5fd",
  "2y": "#60a5fa",
  "5y": "#3b82f6",
  "10y": "#1d4ed8",
  "30y": "#1e3a8a",
};

const JP_COLORS: Record<string, string> = {
  "3m": "#d8b4fe",
  "2y": "#c084fc",
  "5y": "#8b5cf6",
  "10y": "#6d28d9",
  "30y": "#4c1d95",
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function MultiLineChart({
  history,
  colors,
}: {
  history: BondYieldPoint[];
  colors: Record<string, string>;
}) {
  const { ref: containerRef, size } = useSvgContainerSize<HTMLDivElement>(300, 110);
  const keys = ["3m", "2y", "5y", "10y", "30y"].filter((k) => colors[k]);
  const validPoints = history.filter((p) => keys.some((k) => p.yields[k] !== undefined));

  if (validPoints.length < 2) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full text-[10px] text-gray-400">
        Insufficient data
      </div>
    );
  }

  const series = keys
    .map((key) => ({
      key,
      label: MATURITY_LABELS[key],
      color: colors[key],
      points: validPoints
        .map((p, i) => ({ x: i, y: p.yields[key], date: p.date }))
        .filter((p) => p.y !== undefined),
    }))
    .filter((s) => s.points.length > 0);

  if (series.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full text-[10px] text-gray-400">
        Insufficient data
      </div>
    );
  }

  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeY = maxY - minY || 1;

  const width = size.width;
  const height = size.height;
  const pad = { top: 4, right: 6, bottom: 12, left: 24 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = Math.max(height - pad.top - pad.bottom, 1);

  const xScale = plotW / (validPoints.length - 1);
  const yScale = plotH / rangeY;

  const toSvg = (x: number, y: number) => ({
    sx: pad.left + x * xScale,
    sy: pad.top + (maxY - y) * yScale,
  });

  const gridCount = 3;
  const gridYs = Array.from({ length: gridCount + 1 }, (_, i) => minY + (rangeY * i) / gridCount);

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && height > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {gridYs.map((y, i) => {
            const { sy } = toSvg(0, y);
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={sy}
                  x2={width - pad.right}
                  y2={sy}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text x={pad.left - 3} y={sy + 2.5} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {y.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            const d = s.points
              .map((p, i) => {
                const { sx, sy } = toSvg(p.x, p.y);
                return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
              })
              .join(" ");
            return (
              <path
                key={s.key}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {series.map((s) => {
            const last = s.points[s.points.length - 1];
            const { sx, sy } = toSvg(last.x, last.y);
            const labelWidth = 20;
            const endLabelOverflows = sx + labelWidth > width - pad.right;
            return (
              <text
                key={`label-${s.key}`}
                x={endLabelOverflows ? Math.max(sx - 4, pad.left) : sx + 4}
                y={sy + 3}
                fontSize="7"
                fontWeight="500"
                fill={s.color}
                textAnchor={endLabelOverflows ? "end" : "start"}
              >
                {s.label}
              </text>
            );
          })}

          <text x={pad.left} y={height - 2} textAnchor="start" fontSize="6" fill="#9ca3af">
            {formatShortDate(validPoints[0].date)}
          </text>
          <text x={width - pad.right} y={height - 2} textAnchor="end" fontSize="6" fill="#9ca3af">
            {formatShortDate(validPoints[validPoints.length - 1].date)}
          </text>
        </svg>
      )}
    </div>
  );
}

function Legend({
  history,
  colors,
}: {
  history: BondYieldPoint[];
  colors: Record<string, string>;
}) {
  const keys = ["3m", "2y", "5y", "10y", "30y"].filter(
    (k) => colors[k] && history.some((p) => p.yields[k] !== undefined)
  );
  return (
    <div className="flex items-center gap-1.5">
      {keys.map((key) => (
        <div key={key} className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[key] }} />
          <span className="text-[9px] text-gray-500">{MATURITY_LABELS[key]}</span>
        </div>
      ))}
    </div>
  );
}

function CountrySection({
  name,
  data,
  colors,
}: {
  name: string;
  data: {
    yields: Record<string, number>;
    spreads: Record<string, number>;
    source: string;
    note?: string;
    history: BondYieldPoint[];
  };
  colors: Record<string, string>;
}) {
  const spread10y2y = data.spreads["10y_2y"];
  const spread10y3m = data.spreads["10y_3m"];

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-700 truncate">{name}</span>
          <Legend history={data.history} colors={colors} />
        </div>
        {data.source && <span className="text-[9px] text-gray-400 truncate shrink-0">{data.source}</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <MultiLineChart history={data.history} colors={colors} />
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
        {(["3m", "2y", "5y", "10y", "30y"] as const).map((key) =>
          data.yields[key] !== undefined ? (
            <span key={key} className="text-gray-600">
              {MATURITY_LABELS[key]} <span className="font-medium text-gray-800">{data.yields[key].toFixed(2)}%</span>
            </span>
          ) : null
        )}
        {spread10y2y !== undefined && (
          <span className="text-gray-500">
            10Y−2Y <span className={spread10y2y < 0 ? "text-red-600 font-medium" : "text-gray-700 font-medium"}>{spread10y2y.toFixed(2)}%</span>
          </span>
        )}
        {spread10y3m !== undefined && (
          <span className="text-gray-500">
            10Y−3M <span className={spread10y3m < 0 ? "text-red-600 font-medium" : "text-gray-700 font-medium"}>{spread10y3m.toFixed(2)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function BondYieldsPanel({
  title,
  refreshKey,
  onRefresh,
  onExpand,
  description,
}: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getBondYields(), [refreshKey]);

  if (loading && !data) {
    return (
      <PanelContainer
        title={title}
        onRefresh={onRefresh}
        onExpand={onExpand}
        loading={true}
        description={description}
      >
        <PanelLoading />
      </PanelContainer>
    );
  }

  const usSpread10y2y = data?.us?.spreads?.["10y_2y"];
  const jpSpread10y2y = data?.jp?.spreads?.["10y_2y"];
  const usJpSpread = data?.meta?.["us_jp_10y_spread"];

  return (
    <PanelContainer
      title={title}
      onRefresh={onRefresh}
      onExpand={onExpand}
      loading={loading}
      description={description}
    >
      {error && <PanelError message={error} />}
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          <CountrySection
            name="🇺🇸 United States"
            data={data?.us || { yields: {}, spreads: {}, source: "", history: [] }}
            colors={US_COLORS}
          />
          <CountrySection
            name="🇯🇵 Japan"
            data={data?.jp || { yields: {}, spreads: {}, source: "", history: [] }}
            colors={JP_COLORS}
          />
        </div>

        {(usJpSpread || usSpread10y2y !== undefined || jpSpread10y2y !== undefined) && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
            {usJpSpread && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                <span>US−JP 10Y Spread</span>
                <span>{usJpSpread}%</span>
              </div>
            )}
            {usSpread10y2y !== undefined && usSpread10y2y < 0 && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                ⚠ US curve inverted
              </div>
            )}
            {jpSpread10y2y !== undefined && jpSpread10y2y < 0 && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                ⚠ Japan curve inverted
              </div>
            )}
          </div>
        )}

        {data?.meta?.["fred_api_key"] === "not configured" && (
          <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Set <code className="font-mono">FRED_API_KEY</code> for US Treasury yields and the 10Y−2Y spread.
          </div>
        )}
      </div>
    </PanelContainer>
  );
}

export const bondYieldsPanel: PanelDefinition = {
  id: "bond-yields",
  name: "Bond Yields",
  description:
    "US and Japan 2Y/5Y/10Y/30Y sovereign yields (plus 3M for US); negative spreads signal inversion.",
  categories: ["macro"],
  component: BondYieldsPanel,
  filterConfig: { tickerMode: "none" },
};
