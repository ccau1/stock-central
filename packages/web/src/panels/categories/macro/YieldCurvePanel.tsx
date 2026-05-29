import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, renderSvgLine, usePanelData } from "../../core";

export function YieldCurvePanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getYieldCurve(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const spread10y3m = data?.spreads?.["10y_3m"] ?? 0;
  const inverted = spread10y3m < 0;

  const points = data
    ? [
        { label: "3M", val: data.yields["3m"] },
        { label: "5Y", val: data.yields["5y"] },
        { label: "10Y", val: data.yields["10y"] },
        { label: "30Y", val: data.yields["30y"] },
      ].filter((d) => d.val !== undefined)
    : [];

  const ycMin = Math.min(...points.map((d) => d.val ?? 0));
  const ycMax = Math.max(...points.map((d) => d.val ?? 0));
  const ycRange = ycMax - ycMin || 1;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">10Y − 3M</span>
          <span className={`font-bold ${inverted ? "text-red-600" : "text-gray-800"}`}>{spread10y3m.toFixed(2)}%</span>
        </div>
        {data?.yields["10y"] !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">10Y Treasury</span>
            <span className="font-medium text-gray-700">{data.yields["10y"].toFixed(2)}%</span>
          </div>
        )}
        <div className={`text-[10px] font-medium ${inverted ? "text-red-600" : "text-green-600"}`}>
          {inverted ? "⚠ Inverted — recession signal" : "✓ Normal slope"}
        </div>
      </div>
      <div className="h-24 mt-2">
        {points.length > 0 ? (
          <svg viewBox="0 0 300 80" className="w-full h-full">
            {[0, 1, 2, 3].map((i) => {
              const y = 5 + (i / 3) * 70;
              return <line key={i} x1="30" y1={y} x2="290" y2={y} stroke="#f3f4f6" strokeWidth="1" />;
            })}
            <text x="25" y="10" textAnchor="end" fontSize="7" fill="#9ca3af">{ycMax.toFixed(1)}%</text>
            <text x="25" y="78" textAnchor="end" fontSize="7" fill="#9ca3af">{ycMin.toFixed(1)}%</text>
            {renderSvgLine(points.map((d, i) => ({ x: i, y: d.val })), 300, 80, inverted ? "#ef4444" : "#3b82f6", true)}
            {points.map((d, i) => {
              const x = 30 + (i / (points.length - 1)) * 260;
              return <text key={d.label} x={x} y="79" textAnchor="middle" fontSize="8" fill="#6b7280">{d.label}</text>;
            })}
            {points.map((d, i) => {
              const x = 30 + (i / (points.length - 1)) * 260;
              const y = 5 + ((ycMax - d.val) / ycRange) * 70;
              return <circle key={d.label} cx={x} cy={y} r="2.5" fill={inverted ? "#ef4444" : "#3b82f6"} />;
            })}
          </svg>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const yieldCurvePanel: PanelDefinition = {
  id: "yield-curve",
  name: "Yield Curve",
  description: "Treasury yield curve across maturities. An inverted curve (short-term rates above long-term) is a classic recession signal.",
  category: "macro",
  component: YieldCurvePanel,
  filterConfig: { tickerMode: "none" },
};
