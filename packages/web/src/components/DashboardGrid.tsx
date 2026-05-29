import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useCallback } from "react";
import type { PanelConfig } from "../lib/api";
import { PanelRenderer } from "../panels/core";
import type { DashboardFilters } from "../panels/core";

function buildResponsiveLayouts(
  panels: Array<{ id: string; layout: { x: number; y: number; w: number; h: number } }>
) {
  const lg = panels.map((p) => ({
    i: p.id,
    x: p.layout.x,
    y: p.layout.y,
    w: p.layout.w,
    h: p.layout.h,
    minW: 2,
    minH: 3,
  }));

  const stack = (cols: number) => {
    let y = 0;
    return panels.map((p) => {
      const item = {
        i: p.id,
        x: 0,
        y,
        w: Math.min(p.layout.w, cols),
        h: p.layout.h,
        minW: Math.min(2, cols),
        minH: 3,
      };
      y += p.layout.h;
      return item;
    });
  };

  return {
    lg,
    md: stack(10),
    sm: stack(6),
    xs: stack(4),
    xxs: stack(2),
  };
}

interface DashboardGridProps {
  panels: PanelConfig[];
  filters: DashboardFilters;
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
  onRefreshPanel: (panelId: string) => void;
  onLayoutChange: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  isEditMode: boolean;
  panelWrapperClassName?: string;
}

export default function DashboardGrid({
  panels,
  filters,
  globalRefreshKey,
  panelRefreshKeys,
  onRefreshPanel,
  onLayoutChange,
  isEditMode,
  panelWrapperClassName = "bg-white rounded-lg shadow border border-gray-200 overflow-hidden",
}: DashboardGridProps) {
  const { width, containerRef } = useContainerWidth();

  const handleLayoutChange = useCallback(
    (_currentLayout: any, allLayouts: any) => {
      if (allLayouts?.lg) {
        onLayoutChange(allLayouts.lg);
      }
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4">
      <Responsive
        className="layout"
        layouts={buildResponsiveLayouts(panels)}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        width={width}
        onLayoutChange={handleLayoutChange}
        dragConfig={{ enabled: isEditMode, handle: ".panel-drag-handle", cancel: ".panel-refresh-btn" }}
        resizeConfig={{ enabled: isEditMode, handles: ["se", "e", "s"] }}
      >
        {panels.map((panel) => (
          <div key={panel.id} className={panelWrapperClassName}>
            <PanelRenderer
              panel={panel}
              filters={filters}
              refreshKey={(panelRefreshKeys[panel.id] || 0) + globalRefreshKey}
              onRefresh={() => onRefreshPanel(panel.id)}
            />
          </div>
        ))}
      </Responsive>
    </div>
  );
}
