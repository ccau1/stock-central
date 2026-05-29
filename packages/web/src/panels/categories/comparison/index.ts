import type { PanelDefinition } from "../../core/types";
import { comparisonChartPanel } from "./ComparisonChartPanel";
import { rsiComparisonPanel } from "./RsiComparisonPanel";
import { epsBeatPanel } from "./EpsBeatPanel";
import { comparisonGridPanel } from "./ComparisonGridPanel";
import { optionsComparisonPanel } from "./OptionsComparisonPanel";

export const panels: PanelDefinition[] = [
  comparisonChartPanel,
  rsiComparisonPanel,
  epsBeatPanel,
  comparisonGridPanel,
  optionsComparisonPanel,
];
