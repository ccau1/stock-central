import type { PanelDefinition } from "../_core/types";
import { QueryChartPanel } from "./QueryChartPanel";

export const queryChartPanel: PanelDefinition = {
  id: "query-chart",
  name: "Custom Query Chart",
  description:
    "Build any visualization from a declarative query and chart configuration. Supports compact queries, expressions, multi-query merge, client-side transforms, and grid/list layouts.",
  categories: ["generic", "pro"],
  component: QueryChartPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
  settings: [
    { type: "query-editor", key: "query", label: "Query" },
    { type: "chart-editor", key: "chart", label: "Chart" },
  ],
};
