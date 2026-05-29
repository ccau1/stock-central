import { useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import ArticleModal from "../../../components/ArticleModal";

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

  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalSource, setModalSource] = useState<string>("");
  const [modalPublished, setModalPublished] = useState<string>("");

  const openModal = (item: any) => {
    setModalUrl(item.url);
    setModalTitle(item.title);
    setModalSource(item.source);
    setModalPublished(item.published);
  };

  const closeModal = () => {
    setModalUrl(null);
  };

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="space-y-2">
          {data.map((item: any, i: number) => (
            <div key={i} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
              <button
                onClick={() => openModal(item)}
                className="font-medium text-gray-700 leading-tight hover:text-blue-600 hover:underline block text-left w-full"
              >
                {item.title}
              </button>
              <div className="text-gray-400 mt-0.5 flex justify-between">
                <span>{item.source}</span>
                <span>{timeAgo(item.published)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <ArticleModal
        isOpen={!!modalUrl}
        onClose={closeModal}
        url={modalUrl || ""}
        fallbackTitle={modalTitle}
        fallbackSource={modalSource}
        fallbackPublished={modalPublished}
      />
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
