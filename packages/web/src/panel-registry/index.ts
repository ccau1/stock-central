import type { PanelType } from "./types";
import {
  LineChartPanel,
  MetricCardPanel,
  NewsFeedPanel,
  FearGreedPanel,
  RrgPanel,
  ForwardPePanel,
} from "./components";
import {
  YieldCurvePanel,
  MacroCardPanel,
  MacroCardGridPanel,
  MarketBreadthPanel,
  CreditSpreadPanel,
  RatioChartPanel,
  AssetClassGridPanel,
  StockHeatmapPanel,
  SectorHeatmapPanel,
} from "./macro-components";
import {
  ComparisonChartPanel,
  RsiComparisonPanel,
  EpsBeatPanel,
  ComparisonGridPanel,
} from "./comparison-components";

export const panelTypes: PanelType[] = [
  {
    id: "line-chart",
    name: "Line Chart",
    description: "Raw price comparison across selected tickers overlaid in one chart. Hover for crosshair and detailed prices.",
    component: LineChartPanel,
  },
  {
    id: "metric-card",
    name: "Metric Card",
    description: "Display key metrics for selected tickers.",
    component: MetricCardPanel,
  },
  {
    id: "news-feed",
    name: "News Feed",
    description: "Latest news headlines.",
    component: NewsFeedPanel,
  },
  {
    id: "fear-greed",
    name: "Fear & Greed",
    description: "CNN-style Fear & Greed index gauge.",
    component: FearGreedPanel,
  },
  {
    id: "rrg",
    name: "Relative Rotation Graph",
    description: "RRG showing relative momentum vs relative strength.",
    component: RrgPanel,
  },
  {
    id: "forward-pe",
    name: "Forward PE Ratio",
    description: "Compare forward PE ratios across tickers.",
    component: ForwardPePanel,
  },
  {
    id: "yield-curve",
    name: "Yield Curve",
    description: "Treasury yield curve across maturities. An inverted curve (short-term rates above long-term) is a classic recession signal.",
    component: YieldCurvePanel,
  },
  {
    id: "macro-card",
    name: "Macro Indicator Card",
    description: "Single macro indicator snapshot. Use panel settings to choose between VIX, unemployment, inflation, or other key indicators.",
    component: MacroCardPanel,
  },
  {
    id: "macro-card-grid",
    name: "Macro Indicator Grid",
    description: "Overview grid of major macro indicators including VIX, unemployment, inflation, and index performance.",
    component: MacroCardGridPanel,
  },
  {
    id: "market-breadth",
    name: "Market Breadth",
    description: "S&P 500 price versus its 50-day and 200-day moving averages. Shows whether the market is trending above or below key support levels.",
    component: MarketBreadthPanel,
  },
  {
    id: "credit-spread",
    name: "Credit Spread",
    description: "High-yield to investment-grade credit spread. Widening spreads indicate rising credit risk and often precede equity volatility.",
    component: CreditSpreadPanel,
  },
  {
    id: "ratio-chart",
    name: "Ratio Chart",
    description: "Intermarket ratio performance (e.g., cyclicals vs defensives). Divergences can signal shifting economic regimes.",
    component: RatioChartPanel,
  },
  {
    id: "asset-class-grid",
    name: "Asset Class Grid",
    description: "Performance heatmap across major asset classes including equities, bonds, commodities, and real estate.",
    component: AssetClassGridPanel,
  },
  {
    id: "stock-heatmap",
    name: "Stock Heatmap",
    description: "Nasdaq 100 treemap weighted by market cap. Size represents weight; color represents performance.",
    component: StockHeatmapPanel,
  },
  {
    id: "sector-heatmap",
    name: "Sector Heatmap",
    description: "Sector ETF year-to-date performance. Shows which parts of the market are leading or lagging.",
    component: SectorHeatmapPanel,
  },
  {
    id: "comparison-chart",
    name: "% Changes",
    description: "Percentage price change comparison across selected tickers.",
    component: ComparisonChartPanel,
  },
  {
    id: "rsi-comparison",
    name: "RSI Comparison",
    description: "RSI (14) comparison across selected tickers with overbought/oversold zones.",
    component: RsiComparisonPanel,
  },
  {
    id: "eps-beat",
    name: "EPS Beat/Miss",
    description: "Quarterly earnings surprise percentages across selected tickers.",
    component: EpsBeatPanel,
  },
  {
    id: "comparison-grid",
    name: "Comparison Grid",
    description: "Side-by-side fundamental metrics for selected tickers.",
    component: ComparisonGridPanel,
  },
];

export function getPanelType(id: string): PanelType | undefined {
  return panelTypes.find((p) => p.id === id);
}

export * from "./types";
export * from "./shared";
export * from "./hooks";
export * from "./components";
export * from "./macro-components";
export * from "./comparison-components";
