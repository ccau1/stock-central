import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function NewsFeedPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const maxItems = inputs.maxItems || 5;
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getNews(symbols, maxItems),
    [symbols, maxItems, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="space-y-2">
          {data.map((item: any, i: number) => (
            <div key={i} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
              <div className="font-medium text-gray-700 leading-tight">{item.title}</div>
              <div className="text-gray-400 mt-0.5 flex justify-between">
                <span>{item.source}</span>
                <span>{item.published}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelContainer>
  );
}

export const newsFeedPanel: PanelDefinition = {
  id: "news-feed",
  name: "News Feed",
  description: "Latest news headlines.",
  category: "generic",
  component: NewsFeedPanel,
  filterConfig: { tickerMode: "enabled" },
};
