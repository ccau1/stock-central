import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { PanelConfig } from "../lib/api";

export function useExpandedPanel(dashboardPanels: PanelConfig[] | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();

  const expandedPanel = useMemo(() => {
    const expandedId = searchParams.get("expanded");
    if (!expandedId || !dashboardPanels) return null;
    return dashboardPanels.find((p) => p.id === expandedId) || null;
  }, [searchParams, dashboardPanels]);

  const setExpandedPanel = (panel: PanelConfig | null) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (panel?.id) {
        updated.set("expanded", panel.id);
      } else {
        updated.delete("expanded");
      }
      return updated;
    }, { replace: true });
  };

  return { expandedPanel, setExpandedPanel };
}
