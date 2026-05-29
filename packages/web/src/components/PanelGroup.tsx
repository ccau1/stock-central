import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, X, GripVertical } from "lucide-react";
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
  level = 0,
}: PanelGroupProps) {
  const [dragOver, setDragOver] = useState(false);
  const collapsed = group.collapsed ?? false;

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
      className={`flex flex-col h-full rounded-lg border transition-colors ${
        dragOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200 bg-white"
      } ${indentClass}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Group Header */}
      <div className="panel-drag-handle flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/80 rounded-t-lg">
        {isEditMode && (
          <GripVertical size={12} className="text-gray-300 shrink-0 cursor-grab active:cursor-grabbing" />
        )}
        <button
          onClick={() => onToggleGroupCollapse(group.id)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <Folder size={14} className="text-gray-400 shrink-0" />
        <span className="text-xs font-semibold text-gray-700 truncate select-none">{group.title}</span>
        <span className="text-[10px] text-gray-400 ml-auto shrink-0">
          {childPanels.length + childGroups.length} item{childPanels.length + childGroups.length !== 1 ? "s" : ""}
        </span>
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
        <div
          className="p-2 grid gap-2"
          style={{
            gridTemplateColumns: "repeat(12, 1fr)",
            gridAutoRows: "30px",
          }}
        >
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
            />
          ))}
          {childGroups.map((childGroup) => (
            <div
              key={childGroup.id}
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
}: {
  panel: PanelConfig;
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
  isEditMode: boolean;
  onRemovePanel?: (panelId: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative group ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        gridColumn: `${panel.layout.x + 1} / span ${panel.layout.w}`,
        gridRow: `${panel.layout.y + 1} / span ${panel.layout.h}`,
        minHeight: 0,
      }}
    >
      {isEditMode && onRemovePanel && (
        <button
          onClick={() => onRemovePanel(panel.id)}
          className="absolute top-1 right-1 z-10 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove panel"
        >
          <X size={12} />
        </button>
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
