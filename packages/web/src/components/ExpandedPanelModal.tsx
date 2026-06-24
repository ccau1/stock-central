import { X } from "lucide-react";
import type { PanelConfig } from "../lib/api";
import type { DashboardFilters } from "../panels/_core";
import { PanelRenderer } from "../panels/_core";

interface ExpandedPanelModalProps {
  panel: PanelConfig | null;
  onClose: () => void;
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
}

export function ExpandedPanelModal({
  panel,
  onClose,
  filters,
  globalRefreshKey,
  panelRefreshKeys,
  onRefreshPanel,
}: ExpandedPanelModalProps) {
  if (!panel) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-6xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          <PanelRenderer
            panel={panel}
            filters={filters}
            refreshKey={(panelRefreshKeys[panel.id] || 0) + globalRefreshKey}
            onRefresh={() => onRefreshPanel(panel.id)}
          />
        </div>
      </div>
    </div>
  );
}
