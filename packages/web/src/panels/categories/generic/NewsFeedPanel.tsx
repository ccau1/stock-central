import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

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
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-700 leading-tight hover:text-blue-600 hover:underline block"
              >
                {item.title}
              </a>
              <div className="text-gray-400 mt-0.5 flex justify-between">
                <span>{item.source}</span>
                <span>{timeAgo(item.published)}</span>
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
