import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { dataApi } from "../lib/api";
import type { ArticleData } from "../lib/api";
import VideoPlayer from "./VideoPlayer";

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fallbackTitle?: string;
  fallbackSource?: string;
  fallbackPublished?: string;
}

export default function ArticleModal({
  isOpen,
  onClose,
  url,
  fallbackTitle,
  fallbackSource,
  fallbackPublished,
}: ArticleModalProps) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !url) return;
    setLoading(true);
    setError(null);
    setArticle(null);
    dataApi
      .getArticle(url)
      .then((data) => setArticle(data))
      .catch((e: any) => setError(e.message || "Failed to load article"))
      .finally(() => setLoading(false));
  }, [isOpen, url]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {article?.title || fallbackTitle || "Article"}
            </h3>
            <div className="text-[11px] text-gray-400 mt-0.5 truncate">
              {(article?.site_name || fallbackSource) && (
                <span>{article?.site_name || fallbackSource}</span>
              )}
              {(article?.published_time || fallbackPublished) && (
                <span className="ml-2">
                  {article?.published_time
                    ? new Date(article.published_time).toLocaleString()
                    : fallbackPublished}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 ml-2 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {article?.video?.stream_url && (
          <div className="px-4 pt-3">
            <VideoPlayer
              src={article.video.stream_url}
              poster={article.video.thumbnail}
              fallbackUrl={url}
              className="w-full rounded-lg bg-black"
            />
          </div>
        )}

        {article?.tickers && article.tickers.length > 0 && (
          <div className="px-4 pt-3 pb-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {article.tickers.map((t) => {
                const up = t.change_percent >= 0;
                return (
                  <Link
                    key={t.symbol}
                    to={`/ticker/${t.symbol}`}
                    onClick={onClose}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded border text-[11px] font-semibold no-underline hover:opacity-80 ${
                      up
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-red-50 text-red-700 border-red-100"
                    }`}
                  >
                    {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {t.symbol} {up ? "+" : ""}{t.change_percent.toFixed(2)}%
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="text-xs text-gray-500">Loading article…</div>
          )}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {!loading && !error && article && (
            <article
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}
        </div>

        <div className="p-3 border-t border-gray-100 flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open original
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
