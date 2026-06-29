import { Responsive, useContainerWidth } from "react-grid-layout";
import type { ResizeHandleAxis } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useCallback, useMemo, useState } from "react";
import { GripVertical, X, Settings } from "lucide-react";
import type { PanelConfig, GroupConfig } from "../lib/api";
import type { DashboardFilters } from "../panels/_core";
import { PanelRenderer } from "../panels/_core";
import PanelGroup from "./PanelGroup";
import { PanelSettingsModal } from "./PanelSettingsModal";
import { getPanelType } from "../panels/_core/registry";
import type { PanelDefinition } from "../panels/_core/types";

function computeGroupHeights(
  panels: PanelConfig[],
  groups: GroupConfig[]
): Record<string, number> {
  const heights: Record<string, number> = {};
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  function compute(groupId: string): number {
    if (heights[groupId] !== undefined) return heights[groupId];

    const group = groupMap.get(groupId);
    if (!group) return 1;

    const directPanels = panels.filter((p) => p.groupId === groupId);
    const directGroups = groups.filter((g) => g.groupId === groupId);

    let maxBottom = 0;
    for (const p of directPanels) {
      maxBottom = Math.max(maxBottom, p.layout.y + p.layout.h);
    }
    for (const g of directGroups) {
      const subHeight = compute(g.id);
      maxBottom = Math.max(maxBottom, g.layout.y + subHeight);
    }

    heights[groupId] = 1 + maxBottom;
    return heights[groupId];
  }

  for (const g of groups) {
    compute(g.id);
  }

  return heights;
}

function buildResponsiveLayouts(
  panels: PanelConfig[],
  groups: GroupConfig[],
  groupHeights: Record<string, number>
) {
  const topLevelPanels = panels.filter((p) => !p.groupId);
  const topLevelGroups = groups.filter((g) => !g.groupId);

  const items = [
    ...topLevelPanels.map((p) => ({
      id: p.id,
      ...p.layout,
      resizeHandles: ["se", "e", "s"] as ResizeHandleAxis[],
    })),
    ...topLevelGroups.map((g) => ({
      id: g.id,
      x: g.layout.x,
      y: g.layout.y,
      w: g.layout.w,
      h: g.collapsed ? 1 : (groupHeights[g.id] || g.layout.h || 4),
      resizeHandles: ["e"] as ResizeHandleAxis[],
    })),
  ].sort((a, b) => a.y - b.y || a.x - b.x);

  const lg = items.map((p) => ({
    i: p.id,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    minW: 2,
    minH: 1,
    resizeHandles: p.resizeHandles,
  }));

  const stack = (cols: number) => {
    let y = 0;
    return items.map((p) => {
      const item = {
        i: p.id,
        x: 0,
        y,
        w: cols,
        h: p.h,
        minW: Math.min(2, cols),
        minH: 1,
        resizeHandles: p.resizeHandles,
      };
      y += p.h;
      return item;
    });
  };

  const flow = (cols: number, targetCols: number) => {
    const w = Math.floor(cols / targetCols);
    const result = [];
    let x = 0;
    let y = 0;
    let currentRowMaxH = 0;

    for (const p of items) {
      if (x + w > cols) {
        y += currentRowMaxH;
        x = 0;
        currentRowMaxH = 0;
      }
      result.push({
        i: p.id,
        x,
        y,
        w,
        h: p.h,
        minW: Math.min(2, w),
        minH: 1,
        resizeHandles: p.resizeHandles,
      });
      currentRowMaxH = Math.max(currentRowMaxH, p.h);
      x += w;
    }
    return result;
  };

  return {
    lg,
    md: flow(10, 2),
    sm: flow(6, 2),
    xs: stack(4),
    xxs: stack(2),
  };
}

interface DashboardGridProps {
  panels: PanelConfig[];
  groups?: GroupConfig[];
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
  onLayoutChange: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  isEditMode: boolean;
  panelWrapperClassName?: string;
  onRemovePanel?: (panelId: string) => void;
  onToggleGroupCollapse?: (groupId: string) => void;
  onMovePanelToGroup?: (panelId: string, groupId: string | null) => void;
  onRemoveGroup?: (groupId: string) => void;
  onUpdatePanelLayout?: (layout: { i: string; x: number; y: number; w: number; h: number }) => void;
  onUpdatePanel?: (panelId: string, updates: Partial<PanelConfig>) => void;
  onExpandPanel?: (panel: PanelConfig) => void;
}

export default function DashboardGrid({
  panels,
  groups = [],
  filters,
  globalRefreshKey,
  panelRefreshKeys,
  onRefreshPanel,
  onLayoutChange,
  isEditMode,
  onRemovePanel,
  onToggleGroupCollapse,
  onMovePanelToGroup,
  onRemoveGroup,
  onUpdatePanelLayout,
  onUpdatePanel,
  onExpandPanel,
  panelWrapperClassName = "bg-white rounded-lg shadow border border-gray-200 overflow-hidden",
}: DashboardGridProps) {
  const { width, containerRef } = useContainerWidth();
  const [dragOverMain, setDragOverMain] = useState(false);

  const groupHeights = useMemo(
    () => computeGroupHeights(panels, groups),
    [panels, groups]
  );

  const layouts = useMemo(
    () => buildResponsiveLayouts(panels, groups, groupHeights),
    [panels, groups, groupHeights]
  );

  const topLevelPanels = useMemo(
    () => panels.filter((p) => !p.groupId),
    [panels]
  );

  const topLevelGroups = useMemo(
    () => groups.filter((g) => !g.groupId),
    [groups]
  );

  const topLevelChildren = useMemo(() => {
    const panelItems = topLevelPanels.map((panel) => ({
      kind: "panel" as const,
      id: panel.id,
      panel,
      x: panel.layout.x,
      y: panel.layout.y,
    }));
    const groupItems = topLevelGroups.map((group) => ({
      kind: "group" as const,
      id: group.id,
      group,
      x: group.layout.x,
      y: group.layout.y,
    }));
    return [...panelItems, ...groupItems].sort((a, b) => a.y - b.y || a.x - b.x);
  }, [topLevelPanels, topLevelGroups]);

  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [editingPanel, setEditingPanel] = useState<PanelConfig | null>(null);
  const [editingPanelDef, setEditingPanelDef] = useState<PanelDefinition | undefined>(undefined);

  const handleLayoutChange = useCallback(
    (_currentLayout: any, allLayouts: any) => {
      if (currentBreakpoint !== "lg") return;
      if (allLayouts?.lg) {
        onLayoutChange(allLayouts.lg);
      }
    },
    [onLayoutChange, currentBreakpoint]
  );

  const handleMainDragOver = useCallback((e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverMain(true);
  }, [isEditMode]);

  const handleMainDragLeave = useCallback((e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverMain(false);
  }, [isEditMode]);

  const handleMainDrop = useCallback((e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragOverMain(false);
    const panelId = e.dataTransfer.getData("panel/id") || e.dataTransfer.getData("text/plain");
    if (panelId && onMovePanelToGroup) {
      onMovePanelToGroup(panelId, null);
    }
  }, [isEditMode, onMovePanelToGroup]);

  const handleOpenSettings = (panel: PanelConfig) => {
    setEditingPanel(panel);
    getPanelType(panel.type).then((def) => {
      setEditingPanelDef(def);
    });
  };

  return (
    <div
      ref={containerRef}
      data-edit-mode={isEditMode}
      className={`flex-1 overflow-auto p-4 transition-colors ${dragOverMain ? "bg-blue-50/30" : ""}`}
      onDragOver={handleMainDragOver}
      onDragLeave={handleMainDragLeave}
      onDrop={handleMainDrop}
    >
      <Responsive
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        width={width}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={setCurrentBreakpoint}
        dragConfig={{ enabled: isEditMode, handle: ".panel-drag-handle", cancel: ".panel-group-item, .panel-refresh-btn, .panel-expand-btn" }}
        resizeConfig={{ enabled: isEditMode, handles: ["se", "e", "s"] }}
      >
        {topLevelChildren.map((child) =>
          child.kind === "panel" ? (
            <div
              key={child.panel.id}
              className={`${panelWrapperClassName} relative group flex flex-col`}
            >
              {isEditMode && (
                <div className="panel-drag-handle flex items-center gap-1 px-2 py-0.5 border-b border-gray-100 bg-gray-50/40 cursor-grab active:cursor-grabbing shrink-0">
                  <GripVertical size={10} className="text-gray-300" />
                  <span className="text-[10px] text-gray-400 truncate flex-1">{child.panel.title}</span>
                  {onUpdatePanel && (
                    <button
                      onClick={() => handleOpenSettings(child.panel)}
                      className="p-0.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors shrink-0"
                      title="Panel settings"
                    >
                      <Settings size={10} />
                    </button>
                  )}
                  {onRemovePanel && (
                    <button
                      onClick={() => onRemovePanel(child.panel.id)}
                      className="p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                      title="Remove panel"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              )}
              <div
                draggable={isEditMode}
                onDragStart={(e) => {
                  if (!isEditMode) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData("panel/id", child.panel.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 min-h-0"
              >
                <PanelRenderer
                  panel={child.panel}
                  filters={filters}
                  refreshKey={(panelRefreshKeys[child.panel.id] || 0) + globalRefreshKey}
                  onRefresh={() => onRefreshPanel(child.panel.id)}
                  onExpand={() => onExpandPanel?.(child.panel)}
                />
              </div>
            </div>
          ) : (
            <div key={child.group.id} className="h-full">
              <PanelGroup
                group={child.group}
                panels={panels}
                groups={groups}
                groupHeights={groupHeights}
                filters={filters}
                globalRefreshKey={globalRefreshKey}
                panelRefreshKeys={panelRefreshKeys}
                onRefreshPanel={onRefreshPanel}
                isEditMode={isEditMode}
                onToggleGroupCollapse={(gid) => onToggleGroupCollapse?.(gid)}
                onMovePanelToGroup={(panelId, groupId) => onMovePanelToGroup?.(panelId, groupId)}
                onRemovePanel={onRemovePanel}
                onRemoveGroup={onRemoveGroup}
                onUpdatePanelLayout={onUpdatePanelLayout}
                onOpenPanelSettings={handleOpenSettings}
                onExpandPanel={onExpandPanel}
              />
            </div>
          )
        )}
      </Responsive>

      {editingPanel && (
        <PanelSettingsModal
          panel={editingPanel}
          panelDefinition={editingPanelDef}
          onSave={onUpdatePanel || (() => {})}
          onClose={() => {
            setEditingPanel(null);
            setEditingPanelDef(undefined);
          }}
        />
      )}
    </div>
  );
}
