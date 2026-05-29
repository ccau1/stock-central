import { RefreshCw } from "lucide-react";

export function PanelContainer({
  children,
  title,
  onRefresh,
  loading,
  description,
  noPadding = false,
}: {
  children: React.ReactNode;
  title: string;
  onRefresh: () => void;
  loading: boolean;
  description?: string;
  noPadding?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="panel-drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="font-semibold text-sm truncate select-none">{title}</h3>
        <button
          onClick={onRefresh}
          className={`panel-refresh-btn p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ${loading ? "animate-spin" : ""}`}
          disabled={loading}
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <div className={`flex-1 min-h-0 overflow-auto ${noPadding ? "" : "px-3 pb-3"}`}>{children}</div>
      {description && (
        <p className="mt-2 px-3 pb-3 text-[10px] text-gray-400 leading-tight">{description}</p>
      )}
    </div>
  );
}
