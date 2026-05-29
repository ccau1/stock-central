import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { PanelConfig, GroupConfig } from "../lib/api";
import type { DashboardFilters } from "../panels/core";
import { PanelRenderer } from "../panels/core";
import PanelGroup from "./PanelGroup";

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
    ...topLevelPanels.map((p) => ({ id: p.id, ...p.layout })),
    ...topLevelGroups.map((g) => ({
      id: g.id,
      x: g.layout.x,
      y: g.layout.y,
      w: g.layout.w,
      h: g.collapsed ? 1 : (groupHeights[g.id] || g.layout.h || 4),
    })),
  ];

  const lg = items.map((p) => ({
    i: p.id,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    minW: 2,
    minH: 1,
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

  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");

  const handleLayoutChange = useCallback(
    (_currentLayout: any, allLayouts: any) => {
      // Only save layout changes when on the desktop breakpoint.
      // Saving derived lg layouts from smaller breakpoints during resize
      // causes infinite loops when responsive layouts rebuild from updated state.
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
    const panelId = e.dataTransfer.getData("panel/id");
    if (panelId && onMovePanelToGroup) {
      onMovePanelToGroup(panelId, null);
    }
  }, [isEditMode, onMovePanelToGroup]);

  return (
    <div
      ref={containerRef}
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
        dragConfig={{ enabled: isEditMode, handle: ".panel-drag-handle", cancel: ".panel-refresh-btn" }}
        resizeConfig={{ enabled: isEditMode, handles: ["se", "e", "s"] }}
      >
        {/* Ungrouped panels */}
        {topLevelPanels.map((panel) => (
          <div key={panel.id} className={`${panelWrapperClassName} relative group`}>
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
        ))}

        {/* Top-level groups */}
        {topLevelGroups.map((group) => (
          <div key={group.id} className="h-full">
            <PanelGroup
              group={group}
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
            />
          </div>
        ))}
      </Responsive>
    </div>
  );
}
