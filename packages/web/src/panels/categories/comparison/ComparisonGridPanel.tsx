import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { OptionsData } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function ComparisonGridPanel({ title, tickers, enabledTickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const enabledSymbols = enabledTickers ?? symbols;

  const fpState = usePanelData(() => dataApi.getForwardPe(symbols), [symbols.join(","), refreshKey]);
  const rsiState = usePanelData(() => dataApi.getRsi(symbols), [symbols.join(","), refreshKey]);
  const ytdState = usePanelData(() => dataApi.getYtd(symbols), [symbols.join(","), refreshKey]);
  const mcState = usePanelData(() => dataApi.getMetric(symbols, "market_cap"), [symbols.join(","), refreshKey]);
  const optState = usePanelData<OptionsData[]>(() => dataApi.getOptions(symbols), [symbols.join(","), refreshKey]);

  const loading = fpState.loading || rsiState.loading || ytdState.loading || mcState.loading || optState.loading;
  const error = fpState.error || rsiState.error || ytdState.error || mcState.error || optState.error;

  const forwardPe = fpState.data;
  const rsi = rsiState.data;
  const ytd = ytdState.data;
  const marketCap = mcState.data;
  const options = optState.data;

  const getFp = (sym: string) => forwardPe?.find((d: any) => d.symbol === sym);
  const getRsi = (sym: string) => rsi?.find((d: any) => d.symbol === sym);
  const getYtd = (sym: string) => ytd?.find((d: any) => d.symbol === sym);
  const getMc = (sym: string) => marketCap?.find((d: any) => d.symbol === sym);
  const getOpt = (sym: string) => options?.find((d) => d.symbol === sym);

  if (loading && !forwardPe) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {symbols.map((sym) => {
          const isDisabled = !enabledSymbols.includes(sym);
          const fp = getFp(sym);
          const r = getRsi(sym);
          const y = getYtd(sym);
          const mc = getMc(sym);

          return (
            <div key={sym} className={`bg-white rounded-xl border border-gray-200 p-4 transition-opacity ${isDisabled ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Link to={`/ticker/${sym}`} className="text-sm font-bold text-gray-900 hover:text-blue-700 transition-colors">
                    {sym}
                  </Link>
                  {fp && fp.eps_trailing != null && fp.eps_trailing <= 0 && (
                    <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Not Profitable</span>
                  )}
                </div>
                {y && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${y.ytd >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {y.ytd >= 0 ? "↑" : "↓"}
                    {y.ytd >= 0 ? "+" : ""}{y.ytd.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* Next Earnings */}
                {fp && fp.next_earnings_date != null && fp.next_earnings_date > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Next Earnings</span>
                    <span className="text-[10px] font-semibold text-gray-800">
                      {new Date(fp.next_earnings_date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {fp.next_earnings_time && (
                        <span className="text-gray-500 font-normal"> {fp.next_earnings_time}</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Forward PE */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Forward P/E</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {fp ? (fp.forward_pe > 0 ? fp.forward_pe.toFixed(1) + "x" : "–") : "–"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Trailing P/E</span>
                  <span className="text-xs font-medium text-gray-600">
                    {fp ? (fp.trailing_pe > 0 ? fp.trailing_pe.toFixed(1) + "x" : "–") : "–"}
                  </span>
                </div>

                {/* RSI */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">RSI (14)</span>
                  <span className={`text-xs font-semibold ${
                    r ? (r.rsi > 70 ? "text-red-600" : r.rsi < 30 ? "text-green-600" : "text-gray-800") : "text-gray-800"
                  }`}>
                    {r ? r.rsi.toFixed(1) : "–"}
                  </span>
                </div>

                {/* Market Cap */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Market Cap</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {mc ? mc.label : "–"}
                  </span>
                </div>

                {/* EPS */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Trailing EPS</span>
                    <span className="text-xs font-medium text-gray-700">
                      {fp && fp.eps_trailing != null && fp.eps_trailing !== 0 ? "$" + fp.eps_trailing.toFixed(2) : "–"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Forward EPS</span>
                    <span className="text-xs font-medium text-gray-700">
                      {fp ? (fp.forward_eps > 0 ? "$" + fp.forward_eps.toFixed(2) : "–") : "–"}
                    </span>
                  </div>
                  {fp && fp.quarter_label && (fp.eps_actual_q != null || fp.eps_estimate_q != null) && (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-dashed border-gray-100">
                      <span className="text-[10px] text-gray-500">{fp.quarter_label} EPS</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-gray-700">
                          {fp.eps_actual_q != null ? "$" + fp.eps_actual_q.toFixed(2) : "–"}
                          {fp.eps_estimate_q != null && (
                            <span className="text-gray-400"> vs ${fp.eps_estimate_q.toFixed(2)}</span>
                          )}
                        </span>
                        {fp.eps_actual_q != null && fp.eps_estimate_q != null && (
                          <span className={`text-[10px] font-semibold ${fp.eps_actual_q >= fp.eps_estimate_q ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_actual_q >= fp.eps_estimate_q ? "Beat" : "Miss"}
                            {" "}{fp.eps_actual_q >= fp.eps_estimate_q ? "+" : ""}${(fp.eps_actual_q - fp.eps_estimate_q).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Guidance */}
                {fp && (fp.eps_growth !== 0 || fp.revenue_growth !== 0 || fp.num_analysts > 0) && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-700 mb-1">Guidance</div>
                    <div className="space-y-1">
                      {fp.eps_growth !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">EPS Growth</span>
                          <span className={`text-[10px] font-medium ${fp.eps_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_growth >= 0 ? "+" : ""}{(fp.eps_growth * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {fp.revenue_growth !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Rev Growth</span>
                          <span className={`text-[10px] font-medium ${fp.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.revenue_growth >= 0 ? "+" : ""}{(fp.revenue_growth * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {fp.eps_revision_30d !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">EPS Revision (30d)</span>
                          <span className={`text-[10px] font-medium ${fp.eps_revision_30d >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_revision_30d >= 0 ? "+" : ""}${fp.eps_revision_30d.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {fp.num_analysts > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Analysts</span>
                          <span className="text-[10px] font-medium text-gray-700">{fp.num_analysts}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* YTD Bar */}
                {y && (
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-6">YTD</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${y.ytd >= 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(Math.abs(y.ytd) * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Put / Call */}
                {(() => {
                  const opt = getOpt(sym);
                  if (!opt) return null;
                  const totalVol = opt.call_volume + opt.put_volume;
                  const totalOI = opt.call_oi + opt.put_oi;
                  const callVolPct = totalVol > 0 ? (opt.call_volume / totalVol) * 100 : 0;
                  const putVolPct = totalVol > 0 ? (opt.put_volume / totalVol) * 100 : 0;
                  const callOIPct = totalOI > 0 ? (opt.call_oi / totalOI) * 100 : 0;
                  const putOIPct = totalOI > 0 ? (opt.put_oi / totalOI) * 100 : 0;
                  return (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      {/* Volume Ratio */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500">Volume Ratio (P/C)</span>
                          <span className={`text-xs font-bold ${opt.put_call_volume_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                            {opt.put_call_volume_ratio.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${callVolPct}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${putVolPct}%` }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-gray-400">C {formatCompact(opt.call_volume)}</span>
                          <span className="text-[9px] text-gray-400">P {formatCompact(opt.put_volume)}</span>
                        </div>
                      </div>
                      {/* OI Ratio */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500">OI Ratio (P/C)</span>
                          <span className={`text-xs font-bold ${opt.put_call_oi_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                            {opt.put_call_oi_ratio.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${callOIPct}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${putOIPct}%` }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-gray-400">C {formatCompact(opt.call_oi)}</span>
                          <span className="text-[9px] text-gray-400">P {formatCompact(opt.put_oi)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export const comparisonGridPanel: PanelDefinition = {
  id: "comparison-grid",
  name: "Comparison Grid",
  description: "Side-by-side fundamental metrics for selected tickers.",
  category: "comparison",
  component: ComparisonGridPanel,
  filterConfig: { tickerMode: "all" },
};
