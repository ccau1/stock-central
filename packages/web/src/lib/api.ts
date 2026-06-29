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

export interface ArticleTicker {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
}

export interface ArticleVideo {
  embed_url?: string;
  stream_url?: string;
  thumbnail?: string;
  duration?: number;
}

export interface ArticleData {
  title: string;
  byline: string;
  excerpt: string;
  site_name: string;
  published_time: string;
  content: string;
  tickers: ArticleTicker[];
  video?: ArticleVideo;
}

export interface FearGreedData {
  value: number;
  previous_value: number;
  label: string;
  timestamp: string;
}

export interface FearGreedHistoryPoint {
  value: number;
  label: string;
  date: string;
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
  target_low: number;
  target_mean: number;
  target_high: number;
  recommendation: string;
  num_analyst_opinions: number;
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

export interface BondYieldPoint {
  date: string;
  yields: Record<string, number>;
}

export interface BondYieldCountryData {
  yields: Record<string, number>;
  spreads: Record<string, number>;
  source: string;
  note?: string;
  history: BondYieldPoint[];
}

export interface BondYieldsData {
  us: BondYieldCountryData;
  jp: BondYieldCountryData;
  meta: Record<string, string>;
}

export interface DebtToGdpPoint {
  date: string;
  year: string;
  value: number;
}

export interface DebtToGdpData {
  country: string;
  country_name: string;
  current: number;
  current_year: string;
  unit: string;
  history: DebtToGdpPoint[];
  source: string;
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

export interface RecessionIndicator {
  name: string;
  value: number;
  change_1m: number;
  signal: "normal" | "warning" | "critical";
  description: string;
}

export interface RecessionRiskData {
  indicators: RecessionIndicator[];
  risk_score: number;
  risk_label: string;
}

export interface FrothIndicator {
  name: string;
  value: number;
  change_1m: number;
  signal: "low" | "moderate" | "high" | "extreme";
  description: string;
}

export interface FrothData {
  indicators: FrothIndicator[];
  froth_score: number;
  froth_label: string;
}

export interface ValuationPoint {
  date: string;
  price: number;
  ma_200: number;
}

export interface ValuationData {
  current: number;
  ma_200: number;
  premium: number;
  history: ValuationPoint[];
  forward_pe: number;
}

export interface EquityRiskPremiumPoint {
  date: string;
  premium: number;
  earnings_yield: number;
  risk_free_rate: number;
}

export interface EquityRiskPremiumData {
  current: number;
  earnings_yield: number;
  risk_free_rate: number;
  forward_pe: number;
  pe_source: string;
  source: string;
  maturity: string;
  history: EquityRiskPremiumPoint[];
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

export interface UpcomingEarningsEntry {
  symbol: string;
  name: string;
  market_cap: number;
  earnings_date: number;
  earnings_time: string;
}

export interface MacroEvent {
  date: string;
  time: string;
  name: string;
  country: string;
  impact: "high" | "medium" | "low";
  category: string;
}

export interface SectorRotationItem {
  symbol: string;
  name: string;
  returns: Record<string, number>;
}

export interface ScreenStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  market_cap: number;
  volume: number;
  trailing_pe: number;
  forward_pe: number;
  eps_trailing: number;
  eps_forward: number;
  dividend_yield: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  fifty_day_avg: number;
  two_hundred_day_avg: number;
  short_ratio: number;
  short_percent_float: number;
  price_to_book: number;
  book_value: number;
  sector: string;
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

export interface NewsStreamItem {
  uuid: string;
  title: string;
  source: string;
  published: number;
  url: string;
  impact: number;
  impact_label: string;
  tickers: string[];
}

export interface ImportantPersonTrade {
  person: string;
  person_title: string;
  ticker: string;
  company: string;
  action: string;
  shares: number;
  value: number;
  date: string;
  filing_url: string;
  notes: string;
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
  groupId?: string | null;
  description?: string;
}

export interface GroupConfig {
  id: string;
  type: '__group__' | '__row__';
  title: string;
  layout: PanelLayout;
  collapsed?: boolean;
  groupId?: string | null;
}

export interface DashboardYAML {
  id: string;
  name: string;
  filters: {
    tickers: string[];
  };
  panels: PanelConfig[];
  groups?: GroupConfig[];
}

export interface RealEstatePoint {
  date: string;
  value: number;
}

export interface RealEstateSeries {
  id: string;
  name: string;
  unit: string;
  frequency: string;
  current: number;
  change_mom: number;
  change_yoy: number;
  history: RealEstatePoint[];
}

export interface RealEstateOverviewData {
  inventory: RealEstateSeries | null;
  sales: RealEstateSeries | null;
  prices: RealEstateSeries | null;
  mortgage: RealEstateSeries | null;
}

export interface RealEstateSeriesResponse {
  series: RealEstateSeries[];
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

export function createNewsStream(onNews: (items: NewsStreamItem[]) => void, onError?: () => void): EventSource {
  const es = new EventSource(`${API_BASE}/stream/news`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (Array.isArray(data)) {
        onNews(data);
      }
    } catch {
      // ignore heartbeat or malformed
    }
  };
  es.onerror = () => {
    onError?.();
  };
  return es;
}

export const dataApi = {
  getPriceHistory: (symbols: string[], range: string, interval?: string) => {
    const intervalParam = interval ? `&interval=${interval}` : "";
    return fetchJSON<Record<string, PricePoint[]>>(`/data/price?symbols=${symbols.join(",")}&range=${range}${intervalParam}`);
  },
  getMetric: (symbols: string[], metric: string) =>
    fetchJSON<MetricData[]>(`/data/metric?symbols=${symbols.join(",")}&metric=${metric}`),
  getNews: (symbols: string[], limit: number) =>
    fetchJSON<NewsItem[]>(`/data/news?symbols=${symbols.join(",")}&limit=${limit}`),
  getArticle: (url: string) =>
    fetchJSON<ArticleData>(`/data/article?url=${encodeURIComponent(url)}`),
  getFearGreed: () =>
    fetchJSON<FearGreedData>("/data/fear-greed"),
  getFearGreedHistory: (range = "1y") =>
    fetchJSON<FearGreedHistoryPoint[]>(`/data/fear-greed/history?range=${range}`),
  getRrg: (symbols: string[], benchmark: string, lookback: string, trail: number) =>
    fetchJSON<RrgTrail[]>(`/data/rrg?symbols=${symbols.join(",")}&benchmark=${benchmark}&lookback=${lookback}&trail=${trail}`),
  getRrgCached: (() => {
    function cacheKey(symbols: string[], benchmark: string, lookback: string): string {
      return `rrg:${[...symbols].sort().join(",")}:${benchmark}:${lookback}`;
    }
    return (symbols: string[], benchmark: string, lookback: string, trail: number): Promise<RrgTrail[]> => {
      const fetchTrail = Math.max(trail, 20);
      const key = cacheKey(symbols, benchmark, lookback);
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const cached: RrgTrail[] = JSON.parse(raw);
          const hasEnough = cached.every((t) => t.points.length >= trail);
          if (hasEnough) {
            return Promise.resolve(cached.map((t) => ({ ...t, points: t.points.slice(-trail) })));
          }
        }
      } catch {
        /* ignore sessionStorage errors */
      }
      return fetchJSON<RrgTrail[]>(`/data/rrg?symbols=${symbols.join(",")}&benchmark=${benchmark}&lookback=${lookback}&trail=${fetchTrail}`).then((data) => {
        try {
          sessionStorage.setItem(key, JSON.stringify(data));
        } catch {
          /* ignore sessionStorage errors */
        }
        return data.map((t) => ({ ...t, points: t.points.slice(-trail) }));
      });
    };
  })(),
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
  getBondYields: () =>
    fetchJSON<BondYieldsData>("/data/macro/bond-yields"),
  getDebtToGdp: (country?: string) =>
    fetchJSON<DebtToGdpData>(`/data/macro/debt-to-gdp?country=${country || "USA"}`),
  getIndexPerformance: () =>
    fetchJSON<IndexPerformance[]>("/data/macro/indexes"),
  getBreadth: () =>
    fetchJSON<BreadthPoint[]>("/data/macro/breadth"),
  getAssetClasses: () =>
    fetchJSON<AssetClassData[]>("/data/macro/asset-classes"),
  getCreditSpread: () =>
    fetchJSON<CreditSpreadPoint[]>("/data/macro/credit-spread"),
  getRatios: (years = 5, mode: "ratio" | "sector" = "ratio") =>
    fetchJSON<RatioData[]>(`/data/macro/ratios?years=${years}&mode=${mode}`),
  getHeatmap: (universe: string, groupBy?: "sector" | "industry") =>
    fetchJSON<HeatmapData>(`/data/heatmap?universe=${encodeURIComponent(universe)}${groupBy ? `&group_by=${groupBy}` : ""}`),
  getHeatmapUniverses: () =>
    fetchJSON<HeatmapUniverse[]>("/data/heatmap/universes"),
  getScreen: (universe: string) =>
    fetchJSON<ScreenStock[]>(`/data/screen?universe=${encodeURIComponent(universe)}`),
  getBatchQuotes: (symbols: string[]) =>
    fetchJSON<ScreenStock[]>(`/data/batch-quotes?symbols=${symbols.join(",")}`),
  getSectorRotation: () =>
    fetchJSON<SectorRotationItem[]>("/data/sector-rotation"),
  getIPOs: (limit?: number) =>
    fetchJSON<IPOEntry[]>(`/data/macro/ipos?limit=${limit || 5}`),
  getRecessionRisk: () =>
    fetchJSON<RecessionRiskData>("/data/macro/recession-risk"),
  getFroth: () =>
    fetchJSON<FrothData>("/data/macro/froth"),
  getValuation: () =>
    fetchJSON<ValuationData>("/data/macro/valuation"),
  getEquityRiskPremium: (maturity?: "10y" | "30y") => {
    const url = maturity
      ? `/data/macro/equity-risk-premium?maturity=${maturity}`
      : "/data/macro/equity-risk-premium";
    return fetchJSON<EquityRiskPremiumData>(url);
  },
  getUpcomingEarnings: (minMarketCap?: number, universe?: string, limit?: number) => {
    const capParam = minMarketCap === undefined ? 100_000_000_000 : minMarketCap;
    return fetchJSON<UpcomingEarningsEntry[]>(`/data/macro/upcoming-earnings?min_market_cap=${capParam}&universe=${encodeURIComponent(universe || "sp500")}&limit=${limit || 50}`);
  },
  getUpcomingMacroEvents: (windowDays?: number) =>
    fetchJSON<MacroEvent[]>(`/data/macro/upcoming-events?window=${windowDays || 45}`),
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
  listDashboards: (opts?: { ids?: string[]; after?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (opts?.ids && opts.ids.length > 0) query.set("ids", opts.ids.join(","));
    if (opts?.after) query.set("after", opts.after);
    if (opts?.limit && opts.limit > 0) query.set("limit", opts.limit.toString());
    const qs = query.toString();
    return fetchJSON<DashboardRecord[]>(`/dashboards${qs ? `?${qs}` : ""}`);
  },
  getDashboard: (id: string) => fetchJSON<DashboardRecord>(`/dashboards/${id}`),
  createDashboard: (name: string, yaml: string) =>
    fetchJSON<DashboardRecord>("/dashboards", { method: "POST", body: JSON.stringify({ name, yaml }) }),
  updateDashboard: (id: string, name: string, yaml: string) =>
    fetchJSON<DashboardRecord>(`/dashboards/${id}`, { method: "PUT", body: JSON.stringify({ name, yaml }) }),
  deleteDashboard: (id: string) =>
    fetchJSON<void>(`/dashboards/${id}`, { method: "DELETE" }),
  cloneDashboard: (id: string, newName: string) =>
    fetchJSON<DashboardRecord>(`/dashboards/${id}/clone`, { method: "POST", body: JSON.stringify({ name: newName }) }),

  getImportantPeopleTrades: () =>
    fetchJSON<ImportantPersonTrade[]>("/insider/important-people"),

  getRealEstateUsOverview: () =>
    fetchJSON<RealEstateOverviewData>("/data/real-estate/us/overview"),
  getRealEstateUsInventory: () =>
    fetchJSON<RealEstateSeriesResponse>("/data/real-estate/us/inventory"),
  getRealEstateUsSales: () =>
    fetchJSON<RealEstateSeriesResponse>("/data/real-estate/us/sales"),
  getRealEstateUsPrices: () =>
    fetchJSON<RealEstateSeriesResponse>("/data/real-estate/us/prices"),

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
