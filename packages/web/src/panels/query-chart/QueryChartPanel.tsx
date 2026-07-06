import type { PanelProps } from "../_core/types";
import { PanelContainer, PanelError, PanelLoading } from "../_core";
import ChartRenderer from "../../charts/ChartRenderer";
import { useQueryChart } from "./hooks/useQueryChart";
import { buildPanelQuery, buildChartConfig } from "./lib/buildPanelQuery";
import { applyTransforms, type TransformStep } from "./lib/applyTransforms";
import { useMemo } from "react";

export function QueryChartPanel({
  title,
  tickers,
  enabledTickers,
  inputs,
  refreshKey,
  onRefresh,
  onExpand,
  description,
  dashboardVariables,
}: PanelProps) {
  const query = buildPanelQuery(inputs.query, {
    tickers,
    enabledTickers,
    timeRange: inputs.timeRange as string | undefined,
    country: inputs.country as string | undefined,
    dashboardVariables,
    panelVariables: inputs.variables as Record<string, string | string[]> | undefined,
  });

  const chart = buildChartConfig(inputs.chart, title);
  const { data: rawData, loading, error } = useQueryChart(query, refreshKey);
  const data = useMemo(
    () => (rawData ? applyTransforms(rawData, inputs.transform as TransformStep[] | undefined) : null),
    [rawData, inputs.transform]
  );

  if (loading && !data) {
    return (
      <PanelContainer title={chart.title} onRefresh={onRefresh} onExpand={onExpand} loading description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={chart.title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data?.error && <PanelError message={data.error} />}
      {data && !data.error && <ChartRenderer df={{ columns: data.columns, rows: data.rows }} config={chart} />}
    </PanelContainer>
  );
}
