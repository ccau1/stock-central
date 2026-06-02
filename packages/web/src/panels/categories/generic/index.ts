import type { PanelDefinition } from "../../core/types";
import { lineChartPanel } from "./LineChartPanel";
import { metricCardPanel } from "./MetricCardPanel";
import { newsFeedPanel } from "./NewsFeedPanel";
import { fearGreedPanel } from "./FearGreedPanel";
import { rrgPanel } from "./RrgPanel";
import { forwardPePanel } from "./ForwardPePanel";
import { earningsHistoryPanel } from "./EarningsHistoryPanel";
import { seasonalityPanel } from "./SeasonalityPanel";
import { drawdownPanel } from "./DrawdownPanel";
import { analystTargetsPanel } from "./AnalystTargetsPanel";
import { notebookPanel } from "./NotebookPanel";
import { importantPeopleTradesPanel } from "./ImportantPeopleTradesPanel";

export const panels: PanelDefinition[] = [
  lineChartPanel,
  metricCardPanel,
  newsFeedPanel,
  fearGreedPanel,
  rrgPanel,
  forwardPePanel,
  earningsHistoryPanel,
  seasonalityPanel,
  drawdownPanel,
  analystTargetsPanel,
  notebookPanel,
  importantPeopleTradesPanel,
];
