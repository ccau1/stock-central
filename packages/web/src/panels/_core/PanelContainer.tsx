import { Maximize2, RefreshCw } from "lucide-react";

export function PanelContainer({
  children,
  title,
  onRefresh,
  onExpand,
  loading,
  description,
  noPadding = false,
}: {
  children: React.ReactNode;
  title: string;
  onRefresh: () => void;
  onExpand?: () => void;
  loading: boolean;
  description?: string;
  noPadding?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="panel-drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between px-3 pt-3 pb-2"
        onDoubleClick={onExpand}
      >
        <h3 className="font-semibold text-sm truncate select-none">{title}</h3>
        <div className="flex items-center gap-1">
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.();
              }}
              className="panel-expand-btn p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Expand"
            >
              <Maximize2 size={12} />
            </button>
          )}
          <button
            onClick={onRefresh}
            className={`panel-refresh-btn p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ${loading ? "animate-spin" : ""}`}
            disabled={loading}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div className={`flex-1 min-h-0 overflow-auto ${noPadding ? "" : "px-3 pb-3"}`}>{children}</div>
      {description && (
        <p className="px-3 py-2 text-[10px] text-gray-400 leading-tight border-t border-gray-100">{description}</p>
      )}
    </div>
  );
}
