import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Newspaper, X } from "lucide-react";

import { createNewsStream } from "../lib/api";
import type { NewsStreamItem } from "../lib/api";
import CollapsibleBox from "./CollapsibleBox";
import ArticleModal from "./ArticleModal";

const LOAD_TIME_KEY = "stockcentral_news_load_time";
const SEEN_KEY = "stockcentral_news_seen";

function getLoadTime(): number {
  const stored = sessionStorage.getItem(LOAD_TIME_KEY);
  if (stored) return parseInt(stored, 10);
  const now = Math.floor(Date.now() / 1000);
  sessionStorage.setItem(LOAD_TIME_KEY, now.toString());
  return now;
}

function getSeenSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
}

function saveSeenSet(set: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function getInitialDesktopOpen(): boolean {
  try {
    const raw = localStorage.getItem("stockcentral_realtime_news_open");
    if (raw !== null) return raw === "true";
  } catch {
    // ignore
  }
  return true;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts * 1000) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function impactColor(impact: number): string {
  if (impact >= 80) return "bg-red-500";
  if (impact >= 60) return "bg-amber-500";
  return "bg-blue-400";
}

function NewsList({
  items,
  connected,
  onOpenArticle,
}: {
  items: NewsStreamItem[];
  connected: boolean;
  onOpenArticle: (item: NewsStreamItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [items.length]);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-red-400"
          }`}
        />
        <span className="text-[10px] text-gray-400">
          {connected ? "Live" : "Reconnecting..."}
        </span>
      </div>
      <div ref={scrollRef} className="space-y-2 max-h-64 overflow-auto">
        {items.length === 0 && (
          <div className="text-[11px] text-gray-400 py-4 text-center">
            Waiting for news...
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.uuid}
            className="group border-b border-gray-50 last:border-0 pb-2 last:pb-0"
          >
            <div className="flex items-start gap-2">
              <div
                className={`shrink-0 w-1 h-full min-h-[24px] rounded-full ${impactColor(
                  item.impact
                )}`}
                style={{ opacity: 0.7 }}
              />
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onOpenArticle(item)}
                  className="text-[11px] font-medium text-gray-700 leading-tight hover:text-blue-600 hover:underline block text-left w-full"
                >
                  {item.title}
                </button>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-gray-400">{item.source}</span>
                  <span className="text-[9px] text-gray-300">•</span>
                  <span className="text-[9px] text-gray-400">
                    {timeAgo(item.published)}
                  </span>
                  <span
                    className={`text-[9px] font-bold text-white px-1 rounded ${impactColor(
                      item.impact
                    )}`}
                  >
                    {item.impact_label}
                  </span>
                </div>
                {item.tickers && item.tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tickers.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RealTimeNewsBox() {
  const [items, setItems] = useState<NewsStreamItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadTime] = useState(() => getLoadTime());
  const [desktopOpen, setDesktopOpen] = useState(() => getInitialDesktopOpen());
  const seenRef = useRef<Set<string>>(getSeenSet());
  const [, setSeenVersion] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalSource, setModalSource] = useState<string>("");
  const [modalPublished, setModalPublished] = useState<string>("");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAnimating, setMobileAnimating] = useState(false);

  const isVisibleRef = useRef(desktopOpen || mobileOpen);
  useEffect(() => {
    isVisibleRef.current = desktopOpen || mobileOpen;
  }, [desktopOpen, mobileOpen]);

  const markSeen = useCallback((uuids: string[]) => {
    let changed = false;
    for (const id of uuids) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        changed = true;
      }
    }
    if (changed) {
      saveSeenSet(seenRef.current);
      setSeenVersion((v) => v + 1);
    }
  }, []);

  // Mark all current items as seen whenever the news list becomes visible
  useEffect(() => {
    if (desktopOpen || mobileOpen) {
      markSeen(items.map((i) => i.uuid));
    }
  }, [desktopOpen, mobileOpen, items, markSeen]);

  useEffect(() => {
    const es = createNewsStream(
      (newItems) => {
        setItems((prev) => {
          const merged = [...newItems, ...prev];
          const seen = new Set<string>();
          const deduped: NewsStreamItem[] = [];
          for (const item of merged) {
            if (!seen.has(item.uuid)) {
              seen.add(item.uuid);
              deduped.push(item);
            }
          }
          return deduped.slice(0, 50);
        });
        // If the news list is currently visible, mark newly arrived items as seen immediately
        if (isVisibleRef.current) {
          markSeen(newItems.map((i) => i.uuid));
        }
        setConnected(true);
      },
      () => {
        setConnected(false);
      }
    );
    esRef.current = es;

    return () => {
      es.close();
    };
  }, [markSeen]);

  const newCount = items.filter(
    (i) => i.published > loadTime && !seenRef.current.has(i.uuid)
  ).length;

  const openArticle = (item: NewsStreamItem) => {
    setModalUrl(item.url);
    setModalTitle(item.title);
    setModalSource(item.source);
    setModalPublished(new Date(item.published * 1000).toISOString());
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block">
        <CollapsibleBox
          title="Real-Time News"
          badge={newCount > 0 ? newCount : undefined}
          defaultOpen={true}
          storageKey="stockcentral_realtime_news_open"
          onToggle={setDesktopOpen}
        >
          <NewsList items={items} connected={connected} onOpenArticle={openArticle} />
        </CollapsibleBox>
      </div>

      {/* Mobile button */}
      <div className="block sm:hidden shrink-0">
        <button
          onClick={() => {
            setMobileOpen(true);
            requestAnimationFrame(() => setMobileAnimating(true));
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-[11px] font-medium whitespace-nowrap"
        >
          <Newspaper size={12} />
          News
          {newCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
              {newCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile modal */}
      {mobileOpen &&
        createPortal(
          <div
            className={`fixed inset-0 z-[60] flex items-end justify-center sm:hidden transition-colors duration-300 ${
              mobileAnimating ? "bg-black/40" : "bg-black/0"
            }`}
            onClick={() => {
              setMobileAnimating(false);
              setTimeout(() => setMobileOpen(false), 300);
            }}
          >
            <div
              className={`bg-white rounded-t-xl shadow-xl w-full max-h-[80vh] flex flex-col transition-transform duration-300 ease-out ${
                mobileAnimating ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Real-Time News</h3>
                <button
                  onClick={() => {
                    setMobileAnimating(false);
                    setTimeout(() => setMobileOpen(false), 300);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <NewsList items={items} connected={connected} onOpenArticle={openArticle} />
              </div>
            </div>
          </div>,
          document.body
        )}

      <ArticleModal
        isOpen={!!modalUrl}
        onClose={() => setModalUrl(null)}
        url={modalUrl || ""}
        fallbackTitle={modalTitle}
        fallbackSource={modalSource}
        fallbackPublished={modalPublished}
      />
    </>
  );
}
