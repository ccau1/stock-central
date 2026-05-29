import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { dataApi } from "../lib/api";
import type { TickerDetail, OptionsData } from "../lib/api";
import CandlestickChart from "../components/CandlestickChart";
import ArticleModal from "../components/ArticleModal";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function TickerDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const ticker = symbol?.toUpperCase() || "";

  const [data, setData] = useState<TickerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsData, setOptionsData] = useState<OptionsData | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalSource, setModalSource] = useState<string>("");
  const [modalPublished, setModalPublished] = useState<string>("");

  const fetchDetail = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await dataApi.getTickerDetail(ticker);
      setData(detail);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    if (!ticker) return;
    try {
      const current = await dataApi.getOptions([ticker]);
      setOptionsData(current[0] ?? null);
    } catch (e: any) {
      // silently fail
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchOptions();
  }, [ticker]);

  const ytd = data?.ytd;
  const rsi = data?.rsi;
  const fp = data?.forwardPe;
  const price = data?.price;
  const marketCap = data?.marketCap;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{ticker}</h1>
              {fp && fp.eps_trailing != null && fp.eps_trailing <= 0 && (
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">Not Profitable</span>
              )}
            </div>
            <p className="text-xs text-gray-500">Stock Detail</p>
          </div>
        </div>
        <button
          onClick={fetchDetail}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="text-xs text-red-500 mb-4">{error}</div>}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Price</div>
          <div className="text-sm font-bold text-gray-900">{price ? price.label : "–"}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">YTD</div>
          <div className={`text-sm font-bold ${ytd && ytd.ytd >= 0 ? "text-green-600" : "text-red-600"}`}>
            {ytd ? (
              <span className="flex items-center gap-0.5">
                {ytd.ytd >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {ytd.ytd >= 0 ? "+" : ""}{ytd.ytd.toFixed(1)}%
              </span>
            ) : (
              "–"
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Market Cap</div>
          <div className="text-sm font-bold text-gray-900">{marketCap ? marketCap.label : "–"}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Forward P/E</div>
          <div className="text-sm font-bold text-gray-900">
            {fp && fp.forward_pe > 0 ? `${fp.forward_pe.toFixed(1)}x` : "–"}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Trailing P/E</div>
          <div className="text-sm font-bold text-gray-900">
            {fp && fp.trailing_pe > 0 ? `${fp.trailing_pe.toFixed(1)}x` : "–"}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">RSI (14)</div>
          <div className={`text-sm font-bold ${
            rsi ? (rsi.rsi > 70 ? "text-red-600" : rsi.rsi < 30 ? "text-green-600" : "text-gray-900") : "text-gray-900"
          }`}>
            {rsi ? rsi.rsi.toFixed(1) : "–"}
          </div>
        </div>
      </div>

      {/* Options Metrics */}
      {optionsData && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Options Activity</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">P/C Volume Ratio</div>
              <div className={`text-sm font-bold ${optionsData.put_call_volume_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                {optionsData.put_call_volume_ratio.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">P/C OI Ratio</div>
              <div className={`text-sm font-bold ${optionsData.put_call_oi_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                {optionsData.put_call_oi_ratio.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Call Volume</div>
              <div className="text-sm font-bold text-gray-900">{formatCompact(optionsData.call_volume)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Put Volume</div>
              <div className="text-sm font-bold text-gray-900">{formatCompact(optionsData.put_volume)}</div>
            </div>
          </div>

          {/* Volume Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-2">Volume Breakdown</div>
              {(() => {
                const total = optionsData.call_volume + optionsData.put_volume;
                const callPct = total > 0 ? (optionsData.call_volume / total) * 100 : 0;
                const putPct = total > 0 ? (optionsData.put_volume / total) * 100 : 0;
                return (
                  <>
                    <div className="flex h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-green-500" style={{ width: `${callPct}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${putPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-green-600 font-medium">Calls {callPct.toFixed(1)}%</span>
                      <span className="text-red-600 font-medium">Puts {putPct.toFixed(1)}%</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-2">Open Interest Breakdown</div>
              {(() => {
                const total = optionsData.call_oi + optionsData.put_oi;
                const callPct = total > 0 ? (optionsData.call_oi / total) * 100 : 0;
                const putPct = total > 0 ? (optionsData.put_oi / total) * 100 : 0;
                return (
                  <>
                    <div className="flex h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-green-500" style={{ width: `${callPct}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${putPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-green-600 font-medium">Calls {callPct.toFixed(1)}%</span>
                      <span className="text-red-600 font-medium">Puts {putPct.toFixed(1)}%</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Candlestick Chart */}
      <CandlestickChart symbol={ticker} />

      {/* Guidance */}
      {fp && (fp.eps_growth != null || fp.revenue_growth != null || fp.eps_revision_30d != null || fp.num_analysts != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {fp.eps_growth != null && fp.eps_growth !== 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">EPS Growth (est.)</div>
              <div className={`text-sm font-bold ${fp.eps_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fp.eps_growth >= 0 ? "+" : ""}{(fp.eps_growth * 100).toFixed(1)}%
              </div>
            </div>
          )}
          {fp.revenue_growth != null && fp.revenue_growth !== 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Rev Growth (est.)</div>
              <div className={`text-sm font-bold ${fp.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fp.revenue_growth >= 0 ? "+" : ""}{(fp.revenue_growth * 100).toFixed(1)}%
              </div>
            </div>
          )}
          {fp.eps_revision_30d != null && fp.eps_revision_30d !== 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">EPS Revision (30d)</div>
              <div className={`text-sm font-bold ${fp.eps_revision_30d >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fp.eps_revision_30d >= 0 ? "+" : ""}${fp.eps_revision_30d.toFixed(2)}
              </div>
            </div>
          )}
          {fp.num_analysts != null && fp.num_analysts > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Analysts</div>
              <div className="text-sm font-bold text-gray-900">{fp.num_analysts}</div>
            </div>
          )}
        </div>
      )}

      {/* News */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Latest News</h2>
        {data?.news && data.news.length > 0 ? (
          <div className="space-y-3">
            {data.news.map((item, i) => (
              <div key={i} className="text-xs p-3 bg-gray-50 rounded border border-gray-100">
                <button
                  onClick={() => {
                    setModalUrl(item.url || null);
                    setModalTitle(item.title);
                    setModalSource(item.source);
                    setModalPublished(item.published);
                  }}
                  className="font-medium text-gray-700 leading-tight hover:text-blue-600 hover:underline block text-left w-full"
                >
                  {item.title}
                </button>
                <div className="text-gray-400 mt-1 flex justify-between">
                  <span>{item.source}</span>
                  <span>{timeAgo(item.published)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400">No news available.</div>
        )}
      </div>

      <ArticleModal
        isOpen={!!modalUrl}
        onClose={() => setModalUrl(null)}
        url={modalUrl || ""}
        fallbackTitle={modalTitle}
        fallbackSource={modalSource}
        fallbackPublished={modalPublished}
      />
    </div>
  );
}
