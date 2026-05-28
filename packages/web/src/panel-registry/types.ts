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

export interface PanelType {
  id: string;
  name: string;
  description: string;
  component: ComponentType<PanelProps>;
}
