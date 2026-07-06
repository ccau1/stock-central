import type { ComponentType } from "react";
import type { DashboardVariable } from "../../lib/api";

export interface PanelProps {
  title: string;
  tickers?: string[];
  enabledTickers?: string[];
  inputs: Record<string, any>;
  refreshKey: number;
  onRefresh: () => void;
  onExpand?: () => void;
  description?: string;
  dashboardVariables?: DashboardVariable[];
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

export interface PanelNumberSetting {
  type: "number";
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface PanelBooleanSetting {
  type: "boolean";
  key: string;
  label: string;
}

export interface PanelColorSetting {
  type: "color";
  key: string;
  label: string;
}

export interface PanelQueryEditorSetting {
  type: "query-editor";
  key: string;
  label: string;
}

export interface PanelChartEditorSetting {
  type: "chart-editor";
  key: string;
  label: string;
}

export interface PanelCodeSetting {
  type: "code";
  key: string;
  label: string;
  language?: "yaml" | "json";
}

export type PanelSettingField =
  | PanelSelectSetting
  | PanelTextSetting
  | PanelNumberSetting
  | PanelBooleanSetting
  | PanelColorSetting
  | PanelQueryEditorSetting
  | PanelChartEditorSetting
  | PanelCodeSetting;

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
