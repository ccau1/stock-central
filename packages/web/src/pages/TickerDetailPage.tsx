import { useEffect, useState } from "react";
import { RANGE_OPTIONS, RANGE_LABELS, type TimeRange } from "./ComparisonsPage";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { dataApi } from "../lib/api";
import type { TickerDetail, PricePoint } from "../lib/api";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";

function PriceChart({ points, loading }: { points: PricePoint[]; loading: boolean }) {
  if (points.length < 2) return null;

  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const range = max - min || 1;

  const { ref: containerRef, size } = useSvgContainerSize(800, 320);
  const W = size.width;
  const H = size.height;
  const padL = 56;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const gw = W - padL - padR;
  const gh = H - padT - padB;

  const xScale = gw / (points.length - 1);
  const yScale = gh / range;

  const toSvg = (i: number, price: number) => ({
    sx: padL + i * xScale,
    sy: padT + (max - price) * yScale,
  });

  const pathD = points
    .map((p, i) => {
      const { sx, sy } = toSvg(i, p.price);
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
    })
    .join(" ");

  const gridLines = 5;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => min + (range * i) / gridLines);

  const startPrice = points[0].price;
  const endPrice = points[points.length - 1].price;
  const isUp = endPrice >= startPrice;
  const strokeColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">Price History</h2>
        {loading && <RefreshCw size={12} className="text-gray-400 animate-spin" />}
      </div>
      <div ref={containerRef} className="w-full h-80">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        {gridYs.map((y, i) => {
          const { sy } = toSvg(0, y);
          return (
            <g key={i}>
              <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                ${y.toFixed(2)}
              </text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle
          cx={toSvg(points.length - 1, endPrice).sx}
          cy={toSvg(points.length - 1, endPrice).sy}
          r="3"
          fill={strokeColor}
        />
        </svg>
      </div>
    </div>
  );
}

export default function TickerDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const ticker = symbol?.toUpperCase() || "";

  const [data, setData] = useState<TickerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);

  const fetchDetail = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await dataApi.getTickerDetail(ticker);
      setData(detail);
      setPriceHistory(detail.priceHistory);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    if (!ticker) return;
    try {
      const ph = await dataApi.getPriceHistory([ticker], timeRange);
      setPriceHistory(ph[ticker] || []);
    } catch (e: any) {
      // silently fail for chart refresh
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticker]);

  useEffect(() => {
    fetchPriceHistory();
  }, [ticker, timeRange]);

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

      {/* Time Range */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-gray-500 font-medium">Range:</span>
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
              timeRange === r
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Price Chart */}
      <PriceChart points={priceHistory} loading={loading} />

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
                <div className="font-medium text-gray-700 leading-tight">{item.title}</div>
                <div className="text-gray-400 mt-1 flex justify-between">
                  <span>{item.source}</span>
                  <span>{item.published}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400">No news available.</div>
        )}
      </div>
    </div>
  );
}
