import type { PanelDefinition } from "../../core/types";
import { yieldCurvePanel } from "./YieldCurvePanel";
import { macroCardPanel } from "./MacroCardPanel";
import { macroCardGridPanel } from "./MacroCardGridPanel";
import { marketBreadthPanel } from "./MarketBreadthPanel";
import { creditSpreadPanel } from "./CreditSpreadPanel";
import { ratioChartPanel } from "./RatioChartPanel";
import { assetClassGridPanel } from "./AssetClassGridPanel";
import { stockHeatmapPanel } from "./StockHeatmapPanel";
import { sectorHeatmapPanel } from "./SectorHeatmapPanel";
import { ipoPanel } from "./IPOPanel";
import { recessionRiskPanel } from "./RecessionRiskPanel";
import { marketFrothPanel } from "./MarketFrothPanel";
import { valuationPanel } from "./ValuationPanel";

export const panels: PanelDefinition[] = [
  yieldCurvePanel,
  macroCardPanel,
  macroCardGridPanel,
  marketBreadthPanel,
  creditSpreadPanel,
  ratioChartPanel,
  assetClassGridPanel,
  stockHeatmapPanel,
  sectorHeatmapPanel,
  ipoPanel,
  recessionRiskPanel,
  marketFrothPanel,
  valuationPanel,
];
