import { useEffect, useState } from "react";
import type { PanelConfig } from "../../lib/api";
import type { DashboardFilters, PanelDefinition } from "./types";
import { getPanelType, isRegistryLoaded } from "./registry";
import { PanelLoading } from "./";

interface PanelRendererProps {
  panel: PanelConfig;
  filters: DashboardFilters;
  refreshKey: number;
  onRefresh: () => void;
}

export function PanelRenderer({ panel, filters, refreshKey, onRefresh }: PanelRendererProps) {
  const [typeDef, setTypeDef] = useState<PanelDefinition | undefined>(undefined);
  const [loading, setLoading] = useState(!isRegistryLoaded());

  useEffect(() => {
    if (isRegistryLoaded()) {
      getPanelType(panel.type).then(setTypeDef);
      return;
    }
    setLoading(true);
    getPanelType(panel.type).then((def) => {
      setTypeDef(def);
      setLoading(false);
    });
  }, [panel.type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        <PanelLoading />
      </div>
    );
  }

  const Component = typeDef?.component;

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        Unknown panel type: {panel.type}
      </div>
    );
  }

  const fc = typeDef.filterConfig;

  // Determine tickers based on filter config
  let tickers: string[] | undefined;
  if (fc?.tickerMode === "none") {
    tickers = undefined;
  } else if (fc?.tickerMode === "all") {
    tickers = filters.tickers;
  } else {
    // default: enabled tickers
    tickers = filters.enabledTickers ?? filters.tickers;
  }

  // Merge timeRange into inputs if configured
  let inputs = panel.inputs;
  if (fc?.injectTimeRange && filters.timeRange) {
    inputs = { ...inputs, timeRange: filters.timeRange };
  }

  return (
    <Component
      title={panel.title}
      tickers={tickers}
      enabledTickers={filters.enabledTickers}
      inputs={inputs}
      refreshKey={refreshKey}
      onRefresh={onRefresh}
      description={typeDef.description}
    />
  );
}
