const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

// ---------- Data API Types ----------

export interface PricePoint {
  date: string;
  price: number;
}

export interface MetricData {
  symbol: string;
  metric: string;
  value: number;
  label: string;
}

export interface NewsItem {
  title: string;
  source: string;
  published: string;
  summary: string;
  url?: string;
}

export interface FearGreedData {
  value: number;
  previous_value: number;
  label: string;
  timestamp: string;
}

export interface RrgPoint {
  date: string;
  rs: number;
  rm: number;
}

export interface RrgTrail {
  symbol: string;
  points: RrgPoint[];
}

export interface QuarterlyEarning {
  date: string;
  actual: number;
  estimate: number;
  beat_pct: number;
}

export interface ForwardPeData {
  symbol: string;
  forward_pe: number;
  forward_pe_next_fy: number;
  trailing_pe: number;
  forward_eps: number;
  forward_eps_next_fy: number;
  eps_trailing: number;
  eps_growth: number;
  revenue_growth: number;
  eps_revision_30d: number;
  num_analysts: number;
  eps_actual_q: number;
  eps_estimate_q: number;
  quarter_label: string;
  earnings_history: QuarterlyEarning[];
  next_earnings_date: number;
  next_earnings_time: string;
}

export interface RsiData {
  symbol: string;
  rsi: number;
}

export interface YtdData {
  symbol: string;
  ytd: number;
}

export interface MacroIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  change_pct: number;
}

export interface YieldCurveData {
  yields: Record<string, number>;
  spreads: Record<string, number>;
}

export interface IndexPerformance {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  ytd: number;
}

export interface RatioPoint {
  date: string;
  ratio: number;
}

export interface RatioData {
  name: string;
  points: RatioPoint[];
}

export interface BreadthPoint {
  date: string;
  price: number;
  ma_50: number;
  ma_200: number;
}

export interface AssetClassData {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change_1m: number;
  change_3m: number;
  change_6m: number;
  ytd: number;
}

export interface CreditSpreadPoint {
  date: string;
  spread: number;
  hy_price: number;
  ig_price: number;
}

export interface HeatmapStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  change_percent: number;
  market_cap: number;
  volume: number;
}

export interface HeatmapSector {
  sector: string;
  stocks: HeatmapStock[];
  total_cap: number;
}

export interface HeatmapData {
  sectors: HeatmapSector[];
}

export interface HeatmapUniverse {
  id: string;
  name: string;
}

export interface IPOEntry {
  symbol: string;
  name: string;
  date: string;
  exchange: string;
  price_range: string;
  shares: number;
  deal_size: number;
  market_cap: number;
  revenue: number;
  status: string;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface OptionsData {
  symbol: string;
  call_volume: number;
  put_volume: number;
  call_oi: number;
  put_oi: number;
  put_call_volume_ratio: number;
  put_call_oi_ratio: number;
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  date: string;
  value: number;
}

export interface IndicatorSeries {
  name: string;
  points: IndicatorPoint[];
}

export interface IndicatorsResponse {
  symbol: string;
  indicators: IndicatorSeries[];
}

export interface FormulaRequest {
  symbol: string;
  range: string;
  interval: string;
  formula: string;
}

export interface FormulaResponse {
  symbol: string;
  name: string;
  points: IndicatorPoint[];
}

export interface TickerDetail {
  symbol: string;
  price: MetricData | null;
  marketCap: MetricData | null;
  forwardPe: ForwardPeData | null;
  rsi: RsiData | null;
  ytd: YtdData | null;
  priceHistory: PricePoint[];
  news: NewsItem[];
}

export interface DashboardRecord {
  id: string;
  name: string;
  yaml: string;
  created_at: string;
  updated_at: string;
}

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelConfig {
  id: string;
  type: string;
  title: string;
  layout: PanelLayout;
  inputs: Record<string, any>;
  refreshInterval?: number;
}

export interface DashboardYAML {
  id: string;
  name: string;
  filters: {
    tickers: string[];
  };
  panels: PanelConfig[];
}

// ---------- Helpers ----------

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// ---------- Data API ----------

export const dataApi = {
  getPriceHistory: (symbols: string[], range: string) =>
    fetchJSON<Record<string, PricePoint[]>>(`/data/price?symbols=${symbols.join(",")}&range=${range}`),
  getMetric: (symbols: string[], metric: string) =>
    fetchJSON<MetricData[]>(`/data/metric?symbols=${symbols.join(",")}&metric=${metric}`),
  getNews: (symbols: string[], limit: number) =>
    fetchJSON<NewsItem[]>(`/data/news?symbols=${symbols.join(",")}&limit=${limit}`),
  getFearGreed: () =>
    fetchJSON<FearGreedData>("/data/fear-greed"),
  getRrg: (symbols: string[], benchmark: string, lookback: string, trail: number) =>
    fetchJSON<RrgTrail[]>(`/data/rrg?symbols=${symbols.join(",")}&benchmark=${benchmark}&lookback=${lookback}&trail=${trail}`),
  getForwardPe: (symbols: string[]) =>
    fetchJSON<ForwardPeData[]>(`/data/forward-pe?symbols=${symbols.join(",")}`),
  getRsi: (symbols: string[], period?: number) =>
    fetchJSON<RsiData[]>(`/data/rsi?symbols=${symbols.join(",")}&period=${period || 14}`),
  getYtd: (symbols: string[]) =>
    fetchJSON<YtdData[]>(`/data/ytd?symbols=${symbols.join(",")}`),
  getMacro: () =>
    fetchJSON<MacroIndicator[]>("/data/macro"),
  getYieldCurve: () =>
    fetchJSON<YieldCurveData>("/data/macro/yield-curve"),
  getIndexPerformance: () =>
    fetchJSON<IndexPerformance[]>("/data/macro/indexes"),
  getBreadth: () =>
    fetchJSON<BreadthPoint[]>("/data/macro/breadth"),
  getAssetClasses: () =>
    fetchJSON<AssetClassData[]>("/data/macro/asset-classes"),
  getCreditSpread: () =>
    fetchJSON<CreditSpreadPoint[]>("/data/macro/credit-spread"),
  getRatios: () =>
    fetchJSON<RatioData[]>("/data/macro/ratios"),
  getHeatmap: (universe: string, groupBy?: "sector" | "industry") =>
    fetchJSON<HeatmapData>(`/data/heatmap?universe=${encodeURIComponent(universe)}${groupBy ? `&group_by=${groupBy}` : ""}`),
  getHeatmapUniverses: () =>
    fetchJSON<HeatmapUniverse[]>("/data/heatmap/universes"),
  getIPOs: (limit?: number) =>
    fetchJSON<IPOEntry[]>(`/data/macro/ipos?limit=${limit || 5}`),
  getOptions: (symbols: string[]) =>
    fetchJSON<OptionsData[]>(`/data/options?symbols=${symbols.join(",")}`),
  getCandles: (symbol: string, range: string, interval: string) =>
    fetchJSON<CandleData[]>(`/data/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`),
  getIndicators: (symbol: string, range: string, interval: string, types: string[], params?: Record<string, string>) => {
    const query = new URLSearchParams();
    query.set("symbol", symbol);
    query.set("range", range);
    query.set("interval", interval);
    query.set("types", types.join(","));
    if (params) {
      Object.entries(params).forEach(([k, v]) => query.set(k, v));
    }
    return fetchJSON<IndicatorsResponse>(`/data/indicators?${query.toString()}`);
  },
  postFormula: (req: FormulaRequest) =>
    fetchJSON<FormulaResponse>("/data/formula", { method: "POST", body: JSON.stringify(req) }),

  searchTickers: (query: string) =>
    fetchJSON<TickerSearchResult[]>(`/tickers/search?q=${encodeURIComponent(query)}`),
  // Dashboards API
  listDashboards: () => fetchJSON<DashboardRecord[]>("/dashboards"),
  getDashboard: (id: string) => fetchJSON<DashboardRecord>(`/dashboards/${id}`),
  createDashboard: (name: string, yaml: string) =>
    fetchJSON<DashboardRecord>("/dashboards", { method: "POST", body: JSON.stringify({ name, yaml }) }),
  updateDashboard: (id: string, name: string, yaml: string) =>
    fetchJSON<DashboardRecord>(`/dashboards/${id}`, { method: "PUT", body: JSON.stringify({ name, yaml }) }),
  deleteDashboard: (id: string) =>
    fetchJSON<void>(`/dashboards/${id}`, { method: "DELETE" }),
  cloneDashboard: (id: string, newName: string) =>
    fetchJSON<DashboardRecord>(`/dashboards/${id}/clone`, { method: "POST", body: JSON.stringify({ name: newName }) }),

  getTickerDetail: async (symbol: string) => {
    const [price, marketCap, forwardPe, rsi, ytd, priceHistory, news] = await Promise.all([
      fetchJSON<MetricData[]>(`/data/metric?symbols=${symbol}&metric=price`),
      fetchJSON<MetricData[]>(`/data/metric?symbols=${symbol}&metric=market_cap`),
      fetchJSON<ForwardPeData[]>(`/data/forward-pe?symbols=${symbol}`),
      fetchJSON<RsiData[]>(`/data/rsi?symbols=${symbol}`),
      fetchJSON<YtdData[]>(`/data/ytd?symbols=${symbol}`),
      fetchJSON<Record<string, PricePoint[]>>(`/data/price?symbols=${symbol}&range=1y`),
      fetchJSON<NewsItem[]>(`/data/news?symbols=${symbol}&limit=5`),
    ]);
    return {
      symbol,
      price: price[0] ?? null,
      marketCap: marketCap[0] ?? null,
      forwardPe: forwardPe[0] ?? null,
      rsi: rsi[0] ?? null,
      ytd: ytd[0] ?? null,
      priceHistory: priceHistory[symbol] ?? [],
      news,
    };
  },
};
