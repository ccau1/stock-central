import type { ComponentType } from "react";

export interface PanelProps {
  title: string;
  tickers?: string[];
  enabledTickers?: string[];
  inputs: Record<string, any>;
  refreshKey: number;
  onRefresh: () => void;
  description?: string;
}

export interface PanelFilterConfig {
  /** Which tickers to pass to the panel component */
  tickerMode?: "none" | "enabled" | "all";
  /** Whether to inject the dashboard's timeRange into panel inputs */
  injectTimeRange?: boolean;
}

export interface PanelDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  component: ComponentType<PanelProps>;
  filterConfig?: PanelFilterConfig;
}

export interface DashboardFilters {
  tickers: string[];
  enabledTickers?: string[];
  timeRange?: string;
}
