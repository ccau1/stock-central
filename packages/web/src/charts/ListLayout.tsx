import { useState } from "react";
import type { DataFrame, ChartConfig } from "../lib/query/types";

interface ListLayoutProps {
  df: DataFrame;
  config: ChartConfig;
}

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

export default function ListLayout({ df, config }: ListLayoutProps) {
  const titleField = config.fields?.title ?? "title";
  const subtitleField = config.fields?.subtitle ?? "source";
  const dateField = config.fields?.date ?? "published";
  const linkField = config.fields?.link ?? "url";

  const titleIdx = df.columns.findIndex((c) => c.name === titleField);
  const subtitleIdx = df.columns.findIndex((c) => c.name === subtitleField);
  const dateIdx = df.columns.findIndex((c) => c.name === dateField);
  const linkIdx = df.columns.findIndex((c) => c.name === linkField);

  const maxItems = config.options?.maxItems ?? 10;
  const rows = df.rows.slice(0, maxItems);

  const [expanded, setExpanded] = useState<number | null>(null);

  const renderTitle = (row: unknown[]) => {
    const title = titleIdx >= 0 ? String(row[titleIdx] ?? "") : "";
    const link = linkIdx >= 0 ? String(row[linkIdx] ?? "") : "";

    if (link) {
      return (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-gray-700 leading-tight hover:text-blue-600 hover:underline block text-left"
        >
          {title}
        </a>
      );
    }

    return <div className="font-medium text-gray-700 leading-tight text-left">{title}</div>;
  };

  return (
    <div className="space-y-2 h-full overflow-auto">
      {rows.map((row, i) => {
        const subtitle = subtitleIdx >= 0 ? String(row[subtitleIdx] ?? "") : "";
        const date = dateIdx >= 0 ? String(row[dateIdx] ?? "") : "";
        const isExpanded = expanded === i;

        return (
          <div
            key={i}
            className="text-xs p-2 bg-gray-50 rounded border border-gray-100 cursor-pointer"
            onClick={() => setExpanded(isExpanded ? null : i)}
          >
            {renderTitle(row)}
            <div className="text-gray-400 mt-0.5 flex justify-between">
              {subtitle && <span>{subtitle}</span>}
              {date && <span>{timeAgo(date)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
