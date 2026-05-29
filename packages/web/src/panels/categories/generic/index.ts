import type { PanelDefinition } from "../../core/types";
import { lineChartPanel } from "./LineChartPanel";
import { metricCardPanel } from "./MetricCardPanel";
import { newsFeedPanel } from "./NewsFeedPanel";
import { fearGreedPanel } from "./FearGreedPanel";
import { rrgPanel } from "./RrgPanel";
import { forwardPePanel } from "./ForwardPePanel";

export const panels: PanelDefinition[] = [
  lineChartPanel,
  metricCardPanel,
  newsFeedPanel,
  fearGreedPanel,
  rrgPanel,
  forwardPePanel,
];
