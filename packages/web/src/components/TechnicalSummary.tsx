import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { dataApi } from "../lib/api";
import type { IndicatorsResponse } from "../lib/api";

interface TechnicalSummaryProps {
  symbol: string;
  compact?: boolean;
}

interface TechSummary {
  rsi: number | null;
  macdSignal: "bullish" | "bearish" | "neutral";
  maSignal: "bullish" | "bearish" | "neutral";
  overall: "bullish" | "bearish" | "neutral";
  score: number; // -100 to 100
}

async function fetchSummary(symbol: string): Promise<TechSummary | null> {
  try {
    const res: IndicatorsResponse = await dataApi.getIndicators(symbol, "6mo", "1d", ["rsi", "macd", "sma", "ema"], {
      sma_period: "50",
      ema_period: "20",
    });

    let rsi: number | null = null;
    let macdSignal: TechSummary["macdSignal"] = "neutral";
    let maSignal: TechSummary["maSignal"] = "neutral";

    for (const ind of res.indicators) {
      if (ind.name.startsWith("RSI")) {
        const last = ind.points[ind.points.length - 1]?.value ?? null;
        if (last != null) rsi = last;
      }
      if (ind.name.startsWith("MACD(")) {
        // Find MACD line and signal line
        const macdLine = res.indicators.find((i) => i.name.startsWith("MACD("))?.points;
        const signalLine = res.indicators.find((i) => i.name.startsWith("MACD Signal"))?.points;
        if (macdLine && signalLine && macdLine.length > 0 && signalLine.length > 0) {
          const lastMacd = macdLine[macdLine.length - 1].value;
          const lastSignal = signalLine[signalLine.length - 1].value;
          macdSignal = lastMacd > lastSignal ? "bullish" : lastMacd < lastSignal ? "bearish" : "neutral";
        }
      }
      if (ind.name.startsWith("SMA(50)")) {
        const smaPoints = ind.points;
        const priceRes = await dataApi.getPriceHistory([symbol], "6mo");
        const prices = priceRes[symbol];
        if (prices && prices.length > 0 && smaPoints.length > 0) {
          const lastPrice = prices[prices.length - 1].price;
          const lastSma50 = smaPoints[smaPoints.length - 1].value;
          maSignal = lastPrice > lastSma50 ? "bullish" : lastPrice < lastSma50 ? "bearish" : "neutral";
        }
      }
    }

    let score = 0;
    if (rsi != null) {
      if (rsi < 30) score += 30;
      else if (rsi > 70) score -= 30;
      else score += (50 - rsi) * 0.4;
    }
    if (macdSignal === "bullish") score += 25;
    if (macdSignal === "bearish") score -= 25;
    if (maSignal === "bullish") score += 25;
    if (maSignal === "bearish") score -= 25;

    score = Math.max(-100, Math.min(100, score));

    let overall: TechSummary["overall"] = "neutral";
    if (score > 20) overall = "bullish";
    else if (score < -20) overall = "bearish";

    return { rsi, macdSignal, maSignal, overall, score };
  } catch {
    return null;
  }
}

export function useTechnicalSummary(symbol: string) {
  const [summary, setSummary] = useState<TechSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetchSummary(symbol).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, [symbol]);

  return { summary, loading };
}

export default function TechnicalSummary({ symbol, compact }: TechnicalSummaryProps) {
  const { summary, loading } = useTechnicalSummary(symbol);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${compact ? "" : "mb-6"}`}>
        <div className="text-xs text-gray-400">Loading technical summary...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${compact ? "" : "mb-6"}`}>
        <div className="text-xs text-gray-400">No technical data available.</div>
      </div>
    );
  }

  const overallColor =
    summary.overall === "bullish" ? "text-green-600 bg-green-50 border-green-200" :
    summary.overall === "bearish" ? "text-red-600 bg-red-50 border-red-200" :
    "text-gray-600 bg-gray-50 border-gray-200";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${overallColor}`}>
          {summary.overall === "bullish" ? <TrendingUp size={10} /> : summary.overall === "bearish" ? <TrendingDown size={10} /> : <Minus size={10} />}
          {summary.overall.toUpperCase()}
        </span>
        {summary.rsi != null && (
          <span className="text-[10px] text-gray-500">RSI {summary.rsi.toFixed(1)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-gray-500" />
        <h3 className="text-xs font-bold text-gray-900 uppercase">Technical Summary</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-lg border p-3 ${overallColor}`}>
          <div className="text-[10px] font-medium opacity-80 mb-1">Overall</div>
          <div className="text-sm font-bold flex items-center gap-1">
            {summary.overall === "bullish" ? <TrendingUp size={14} /> : summary.overall === "bearish" ? <TrendingDown size={14} /> : <Minus size={14} />}
            {summary.overall.toUpperCase()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <div className="text-[10px] text-gray-500 mb-1">RSI (14)</div>
          <div className={`text-sm font-bold ${summary.rsi != null ? (summary.rsi > 70 ? "text-red-600" : summary.rsi < 30 ? "text-green-600" : "text-gray-800") : "text-gray-400"}`}>
            {summary.rsi != null ? summary.rsi.toFixed(1) : "–"}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <div className="text-[10px] text-gray-500 mb-1">MACD</div>
          <div className={`text-sm font-bold ${summary.macdSignal === "bullish" ? "text-green-600" : summary.macdSignal === "bearish" ? "text-red-600" : "text-gray-800"}`}>
            {summary.macdSignal.toUpperCase()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <div className="text-[10px] text-gray-500 mb-1">Price vs MA(50)</div>
          <div className={`text-sm font-bold ${summary.maSignal === "bullish" ? "text-green-600" : summary.maSignal === "bearish" ? "text-red-600" : "text-gray-800"}`}>
            {summary.maSignal.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
