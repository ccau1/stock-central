import type { ComponentType } from "react";

export interface PanelProps {
  title: string;
  tickers?: string[];
  enabledTickers?: string[];
  inputs: Record<string, any>;
  refreshKey: number;
  onRefresh: () => void;
  onExpand?: () => void;
  description?: string;
}

export interface PanelFilterConfig {
  /** Which tickers to pass to the panel component */
  tickerMode?: "none" | "enabled" | "all";
  /** Whether to inject the dashboard's timeRange into panel inputs */
  injectTimeRange?: boolean;
  /** Whether to inject the dashboard's country filter into panel inputs */
  injectCountry?: boolean;
}

export interface PanelSelectOption {
  value: string;
  label: string;
}

export interface PanelSelectSetting {
  type: "select";
  key: string;
  label: string;
  options: PanelSelectOption[];
}

export interface PanelTextSetting {
  type: "text";
  key: string;
  label: string;
  placeholder?: string;
}

export type PanelSettingField = PanelSelectSetting | PanelTextSetting;

export interface PanelPreview {
  /** Optional longer description shown in the preview modal */
  description?: string;
  /** Vite-resolved URLs to preview images or GIFs */
  assets: string[];
}

export interface PanelDefinition {
  id: string;
  name: string;
  description: string;
  /** Panel can belong to multiple categories. Empty or omitted falls back to "others". */
  categories?: string[];
  component: ComponentType<PanelProps>;
  filterConfig?: PanelFilterConfig;
  /** Declarative settings for panel inputs, shown in edit mode */
  settings?: PanelSettingField[];
  /** Lazy-load preview assets on demand */
  preview?: () => Promise<PanelPreview>;
}

export interface DashboardFilters {
  tickers: string[];
  enabledTickers?: string[];
  timeRange?: string;
  country?: string;
}
