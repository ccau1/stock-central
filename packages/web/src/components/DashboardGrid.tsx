import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import type { PanelConfig, GroupConfig } from "../lib/api";
import type { DashboardFilters } from "../panels/core";
import { PanelRenderer } from "../panels/core";
import PanelGroup from "./PanelGroup";

/* Custom mouse-based drag handle for moving panels between groups */
function CustomDragHandle({
  panel,
  onMovePanelToGroup,
}: {
  panel: PanelConfig;
  onMovePanelToGroup?: (panelId: string, groupId: string | null) => void;
}) {
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    document.querySelectorAll(".panel-group-container").forEach((el) => {
      el.classList.remove("ring-2", "ring-blue-400", "bg-blue-50/50");
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log("[CustomDrag] mousedown on top-level", panel.id);
    e.preventDefault();
    e.stopPropagation();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;

    const ghost = document.createElement("div");
    ghost.className = "fixed z-[9999] pointer-events-none bg-white/90 border-2 border-blue-400 rounded-lg shadow-lg px-3 py-2 text-xs font-medium text-blue-600";
    ghost.textContent = panel.title || panel.id;
    ghost.style.left = e.clientX + 12 + "px";
    ghost.style.top = e.clientY + 12 + "px";
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const onMouseMove = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx < 3 && dy < 3) return;
      hasMovedRef.current = true;
      if (ghostRef.current) {
        ghostRef.current.style.left = e.clientX + 12 + "px";
        ghostRef.current.style.top = e.clientY + 12 + "px";
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      document.querySelectorAll(".panel-group-container").forEach((el) => {
        el.classList.remove("ring-2", "ring-blue-400", "bg-blue-50/50");
      });
      const groupEl = target?.closest(".panel-group-container") as HTMLElement | null;
      if (groupEl) {
        groupEl.classList.add("ring-2", "ring-blue-400", "bg-blue-50/50");
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      cleanup();
      if (!hasMovedRef.current) {
        console.log("[CustomDrag] mouseup without movement");
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const groupEl = target?.closest(".panel-group-container") as HTMLElement | null;
      console.log("[CustomDrag] mouseup top-level", { targetGroupId: groupEl?.getAttribute("data-group-id") });
      if (groupEl) {
        const groupId = groupEl.getAttribute("data-group-id");
        if (groupId) {
          onMovePanelToGroup?.(panel.id, groupId);
          return;
        }
      }
      onMovePanelToGroup?.(panel.id, null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => cleanup, [cleanup]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute bottom-0 left-0 right-0 z-30 h-3 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
      title="Drag into group"
    >
      <GripVertical size={10} className="text-gray-400" />
    </div>
  );
}

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
  onUpdatePanelLayout?: (layout: { i: string; x: number; y: number; w: number; h: number }) => void;
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
    const panelId = e.dataTransfer.getData("panel/id") || e.dataTransfer.getData("text/plain");
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
        dragConfig={{ enabled: isEditMode, handle: ".panel-drag-handle", cancel: ".panel-group-item, .panel-refresh-btn" }}
        resizeConfig={{ enabled: isEditMode, handles: ["se", "e", "s"] }}
      >
        {/* Ungrouped panels */}
        {topLevelPanels.map((panel) => (
          <div
            key={panel.id}
            className={`${panelWrapperClassName} relative group flex flex-col`}
          >
            {isEditMode && (
              <div className="panel-drag-handle flex items-center gap-1 px-2 py-0.5 border-b border-gray-100 bg-gray-50/40 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical size={10} className="text-gray-300" />
                <span className="text-[10px] text-gray-400 truncate flex-1">{panel.title}</span>
                {onRemovePanel && (
                  <button
                    onClick={() => onRemovePanel(panel.id)}
                    className="p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                    title="Remove panel"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )}
            {isEditMode && (
              <CustomDragHandle panel={panel} onMovePanelToGroup={onMovePanelToGroup} />
            )}
            <div className="flex-1 min-h-0">
              <PanelRenderer
                panel={panel}
                filters={filters}
                refreshKey={(panelRefreshKeys[panel.id] || 0) + globalRefreshKey}
                onRefresh={() => onRefreshPanel(panel.id)}
              />
            </div>
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
              onUpdatePanelLayout={onUpdatePanelLayout}
            />
          </div>
        ))}
      </Responsive>
    </div>
  );
}
