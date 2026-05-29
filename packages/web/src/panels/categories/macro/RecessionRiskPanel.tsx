import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import { AlertTriangle, CheckCircle } from "lucide-react";

function signalColor(signal: string) {
  switch (signal) {
    case "critical": return "bg-red-50 border-red-200 text-red-700";
    case "warning": return "bg-amber-50 border-amber-200 text-amber-700";
    default: return "bg-green-50 border-green-200 text-green-700";
  }
}

function signalIcon(signal: string) {
  switch (signal) {
    case "critical": return <AlertTriangle size={14} className="text-red-500" />;
    case "warning": return <AlertTriangle size={14} className="text-amber-500" />;
    default: return <CheckCircle size={14} className="text-green-500" />;
  }
}

export function RecessionRiskPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getRecessionRisk(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const score = data?.risk_score ?? 0;
  const scoreColor = score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : score >= 25 ? "text-yellow-600" : "text-green-600";
  const scoreBg = score >= 75 ? "bg-red-100" : score >= 50 ? "bg-amber-100" : score >= 25 ? "bg-yellow-100" : "bg-green-100";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-2">
        {/* Risk Score Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-gray-500">Composite Risk</div>
            <div className={`text-xl font-bold ${scoreColor}`}>{data?.risk_label ?? "—"}</div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreBg}`}>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}</span>
          </div>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-1 gap-1.5">
          {data?.indicators.map((ind) => (
            <div key={ind.name} className={`rounded-md border px-2 py-1.5 ${signalColor(ind.signal)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {signalIcon(ind.signal)}
                  <span className="text-xs font-medium">{ind.name}</span>
                </div>
                <span className="text-xs font-bold">{ind.value}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] opacity-80">{ind.description}</span>
                <span className={`text-[10px] font-medium ${ind.change_1m >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {ind.change_1m >= 0 ? "+" : ""}{ind.change_1m.toFixed(2)} 1m
                </span>
              </div>
            </div>
          ))}
        </div>

        {!data?.indicators.length && <PanelLoading />}
      </div>
    </PanelContainer>
  );
}

export const recessionRiskPanel: PanelDefinition = {
  id: "recession-risk",
  name: "Recession Risk",
  description: "Composite recession risk indicators including yield curve, credit spreads, copper/gold ratio, and cyclical vs defensive sector performance.",
  category: "macro",
  component: RecessionRiskPanel,
  filterConfig: { tickerMode: "none" },
};
