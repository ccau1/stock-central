import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Folder, X, GripVertical, Maximize2 } from "lucide-react";
import type { PanelConfig, GroupConfig } from "../lib/api";
import type { DashboardFilters } from "../panels/core/types";
import { PanelRenderer } from "../panels/core";

interface PanelGroupProps {
  group: GroupConfig;
  panels: PanelConfig[];
  groups: GroupConfig[];
  groupHeights: Record<string, number>;
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
  isEditMode: boolean;
  onToggleGroupCollapse: (groupId: string) => void;
  onMovePanelToGroup: (panelId: string, groupId: string | null) => void;
  onRemovePanel?: (panelId: string) => void;
  onRemoveGroup?: (groupId: string) => void;
  onUpdatePanelLayout?: (layout: { i: string; x: number; y: number; w: number; h: number }) => void;
  level?: number;
}

export default function PanelGroup({
  group,
  panels,
  groups,
  groupHeights,
  filters,
  globalRefreshKey,
  panelRefreshKeys,
  onRefreshPanel,
  isEditMode,
  onToggleGroupCollapse,
  onMovePanelToGroup,
  onRemovePanel,
  onRemoveGroup,
  onUpdatePanelLayout: _onUpdatePanelLayout,
  level = 0,
}: PanelGroupProps) {
  const [dragOver, setDragOver] = useState(false);
  const collapsed = group.collapsed ?? false;
  const isRow = group.type === '__row__';

  const childPanels = panels.filter((p) => p.groupId === group.id);
  const childGroups = groups.filter((g) => g.groupId === group.id);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const panelId = e.dataTransfer.getData("panel/id");
    if (panelId) {
      onMovePanelToGroup(panelId, group.id);
    }
  };

  const indentClass = level > 0 ? "ml-2 border-l-2 border-gray-100 pl-2" : "";

  return (
    <div
      className={`flex flex-col h-full transition-colors ${
        isRow
          ? dragOver
            ? "bg-blue-50/30"
            : ""
          : `rounded-lg border ${dragOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200 bg-white"}`
      } ${indentClass}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Group / Row Header */}
      <div
        className={`panel-drag-handle flex items-center gap-1.5 px-2 py-1 transition-colors ${
          isRow
            ? ""
            : "border-b border-gray-100 bg-gray-50/80 rounded-t-lg"
        }`}
      >
        {isEditMode && (
          <GripVertical size={12} className="text-gray-300 shrink-0 cursor-grab active:cursor-grabbing" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroupCollapse(group.id);
          }}
          className={`flex items-center gap-1 transition-colors ${
            isRow ? "text-gray-400 hover:text-gray-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!isRow && (
          <Folder size={14} className="text-gray-400 shrink-0" />
        )}
        <span
          className={`truncate select-none ${
            isRow ? "text-xs font-medium text-gray-500" : "text-xs font-semibold text-gray-700"
          }`}
        >
          {group.title}
        </span>
        {!isRow && (
          <span className="text-[10px] text-gray-400 ml-auto shrink-0">
            {childPanels.length + childGroups.length} item{childPanels.length + childGroups.length !== 1 ? "s" : ""}
          </span>
        )}
        {isEditMode && onRemoveGroup && (
          <button
            onClick={() => onRemoveGroup(group.id)}
            className="ml-1 p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
            title="Remove group"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Children Grid */}
      {!collapsed && (
        <div className={`panel-group-grid grid ${isRow ? "gap-3" : "gap-2 p-2"}`}>
          {childPanels.map((panel) => (
            <PanelGroupItem
              key={panel.id}
              panel={panel}
              filters={filters}
              globalRefreshKey={globalRefreshKey}
              panelRefreshKeys={panelRefreshKeys}
              onRefreshPanel={onRefreshPanel}
              isEditMode={isEditMode}
              onRemovePanel={onRemovePanel}
              onUpdatePanelLayout={_onUpdatePanelLayout}
            />
          ))}
          {childGroups.map((childGroup) => (
            <div
              key={childGroup.id}
              className="panel-group-item"
              style={{
                gridColumn: `${childGroup.layout.x + 1} / span ${childGroup.layout.w}`,
                gridRow: `${childGroup.layout.y + 1} / span ${groupHeights[childGroup.id] || childGroup.layout.h || 4}`,
                minHeight: 0,
              }}
            >
              <PanelGroup
                group={childGroup}
                panels={panels}
                groups={groups}
                groupHeights={groupHeights}
                filters={filters}
                globalRefreshKey={globalRefreshKey}
                panelRefreshKeys={panelRefreshKeys}
                onRefreshPanel={onRefreshPanel}
                isEditMode={isEditMode}
                onToggleGroupCollapse={onToggleGroupCollapse}
                onMovePanelToGroup={onMovePanelToGroup}
                onRemovePanel={onRemovePanel}
                onRemoveGroup={onRemoveGroup}
                onUpdatePanelLayout={_onUpdatePanelLayout}
                level={level + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelGroupItem({
  panel,
  filters,
  globalRefreshKey,
  panelRefreshKeys,
  onRefreshPanel,
  isEditMode,
  onRemovePanel,
  onUpdatePanelLayout,
}: {
  panel: PanelConfig;
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
  isEditMode: boolean;
  onRemovePanel?: (panelId: string) => void;
  onUpdatePanelLayout?: (layout: { i: string; x: number; y: number; w: number; h: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ x: 0, y: 0, w: 0, h: 0, pixelW: 0 });

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("panel/id", panel.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: panel.layout.w,
      h: panel.layout.h,
      pixelW: rect.width,
    };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const onUp = (e: MouseEvent) => {
      const dx = e.clientX - resizeRef.current.x;
      const dy = e.clientY - resizeRef.current.y;
      const colWidth = resizeRef.current.pixelW / resizeRef.current.w;
      const newW = Math.max(1, resizeRef.current.w + Math.round(dx / colWidth));
      const newH = Math.max(1, resizeRef.current.h + Math.round(dy / 30));
      if (newW !== panel.layout.w || newH !== panel.layout.h) {
        onUpdatePanelLayout?.({
          i: panel.id,
          x: panel.layout.x,
          y: panel.layout.y,
          w: newW,
          h: newH,
        });
      }
      setIsResizing(false);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [isResizing, panel, onUpdatePanelLayout]);

  return (
    <div
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`panel-group-item bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative group ${
        isDragging ? "opacity-50" : ""
      } ${isResizing ? "ring-2 ring-blue-300" : ""}`}
      style={{
        gridColumn: `${panel.layout.x + 1} / span ${panel.layout.w}`,
        gridRow: `${panel.layout.y + 1} / span ${panel.layout.h}`,
        minHeight: 0,
      }}
    >
      {isEditMode && (
        <div className="absolute top-1 left-1 z-10 p-0.5 rounded bg-white/80 border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing">
          <GripVertical size={10} className="text-gray-400" />
        </div>
      )}
      {isEditMode && onRemovePanel && (
        <button
          onClick={() => onRemovePanel(panel.id)}
          className="absolute top-1 right-1 z-10 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove panel"
        >
          <X size={12} />
        </button>
      )}
      {isEditMode && onUpdatePanelLayout && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 z-10 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
          title="Resize panel"
        >
          <Maximize2 size={8} className="text-gray-300 hover:text-gray-500" />
        </div>
      )}
      <PanelRenderer
        panel={panel}
        filters={filters}
        refreshKey={(panelRefreshKeys[panel.id] || 0) + globalRefreshKey}
        onRefresh={() => onRefreshPanel(panel.id)}
      />
    </div>
  );
}
