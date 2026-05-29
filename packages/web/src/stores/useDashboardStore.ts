import { useMemo } from "react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import yaml from "js-yaml";
import type { DashboardYAML, PanelLayout, PanelConfig, GroupConfig } from "../lib/api";

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function mapKeysToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

function mapKeysToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

export function parseDashboardYaml(raw: string): DashboardYAML {
  const doc = yaml.load(raw) as any;
  return {
    id: doc.id,
    name: doc.name,
    filters: {
      tickers: doc.filters?.tickers || [],
    },
    groups: (doc.groups || []).map((g: any) => ({
      id: g.id,
      type: g.type || '__group__',
      title: g.title,
      layout: g.layout,
      collapsed: g.collapsed ?? false,
      groupId: g.group ?? null,
    })),
    panels: (doc.panels || []).map((p: any) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      layout: p.layout,
      inputs: mapKeysToCamelCase(p.inputs || {}),
      refreshInterval: p.refresh_interval || 0,
      groupId: p.group ?? null,
    })),
  };
}

function tickersKey(dashboardId: string): string {
  return dashboardId === "macro" ? "stockcentral_tickers" : `stockcentral_${dashboardId}_tickers`;
}

function layoutsKey(dashboardId: string): string {
  return dashboardId === "macro" ? "stockcentral_layouts" : `stockcentral_${dashboardId}_layouts`;
}

function collapseKey(dashboardId: string): string {
  return dashboardId === "macro" ? "stockcentral_collapse" : `stockcentral_${dashboardId}_collapse`;
}

function getSavedTickers(dashboardId: string, defaultTickers: string[]): string[] {
  try {
    const saved = localStorage.getItem(tickersKey(dashboardId));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultTickers;
}

function getSavedLayouts(dashboardId: string): Record<string, PanelLayout> {
  try {
    const saved = localStorage.getItem(layoutsKey(dashboardId));
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {};
}

function getSavedCollapseState(dashboardId: string): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(collapseKey(dashboardId));
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {};
}

function applyLayoutOverrides(dashboard: DashboardYAML): DashboardYAML {
  const overrides = getSavedLayouts(dashboard.id);
  if (Object.keys(overrides).length === 0) return dashboard;
  return {
    ...dashboard,
    panels: dashboard.panels.map((p) =>
      overrides[p.id] ? { ...p, layout: overrides[p.id] } : p
    ),
    groups: (dashboard.groups || []).map((g) =>
      overrides[g.id] ? { ...g, layout: overrides[g.id] } : g
    ),
  };
}

function applyCollapseOverrides(dashboard: DashboardYAML): DashboardYAML {
  const overrides = getSavedCollapseState(dashboard.id);
  if (Object.keys(overrides).length === 0) return dashboard;
  return {
    ...dashboard,
    groups: (dashboard.groups || []).map((g) =>
      overrides[g.id] !== undefined ? { ...g, collapsed: overrides[g.id] } : g
    ),
  };
}

interface DashboardInstanceState {
  dashboard: DashboardYAML;
  tickers: string[];
  globalRefreshKey: number;
  panelRefreshKeys: Record<string, number>;
}

interface DashboardState {
  dashboards: Record<string, DashboardInstanceState>;

  initDashboard: (yaml: DashboardYAML) => void;
  setTickers: (dashboardId: string, tickers: string[]) => void;
  refreshAll: (dashboardId: string) => void;
  refreshPanel: (dashboardId: string, panelId: string) => void;
  addTicker: (dashboardId: string, ticker: string) => void;
  removeTicker: (dashboardId: string, ticker: string) => void;
  clearTickers: (dashboardId: string) => void;
  updatePanelLayouts: (dashboardId: string, layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  addPanel: (dashboardId: string, panel: PanelConfig) => void;
  removePanel: (dashboardId: string, panelId: string) => void;
  toggleGroupCollapse: (dashboardId: string, groupId: string) => void;
  movePanelToGroup: (dashboardId: string, panelId: string, groupId: string | null) => void;
  createGroup: (dashboardId: string, group: GroupConfig) => void;
  removeGroup: (dashboardId: string, groupId: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools((set) => ({
    dashboards: {},

    initDashboard: (yaml) =>
      set((state) => {
        if (state.dashboards[yaml.id]) return state;
        let dashboard = applyLayoutOverrides(yaml);
        dashboard = applyCollapseOverrides(dashboard);
        const tickers = getSavedTickers(yaml.id, dashboard.filters.tickers);
        return {
          dashboards: {
            ...state.dashboards,
            [yaml.id]: {
              dashboard,
              tickers,
              globalRefreshKey: 0,
              panelRefreshKeys: {},
            },
          },
        };
      }),

    setTickers: (dashboardId, tickers) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        localStorage.setItem(tickersKey(dashboardId), JSON.stringify(tickers));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: { ...instance, tickers },
          },
        };
      }),

    refreshAll: (dashboardId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              globalRefreshKey: instance.globalRefreshKey + 1,
            },
          },
        };
      }),

    refreshPanel: (dashboardId, panelId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              panelRefreshKeys: {
                ...instance.panelRefreshKeys,
                [panelId]: (instance.panelRefreshKeys[panelId] || 0) + 1,
              },
            },
          },
        };
      }),

    addTicker: (dashboardId, ticker) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        const t = ticker.trim().toUpperCase();
        if (instance.tickers.includes(t)) return state;
        const next = [...instance.tickers, t];
        localStorage.setItem(tickersKey(dashboardId), JSON.stringify(next));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: { ...instance, tickers: next },
          },
        };
      }),

    removeTicker: (dashboardId, ticker) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        const next = instance.tickers.filter((t) => t !== ticker);
        localStorage.setItem(tickersKey(dashboardId), JSON.stringify(next));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: { ...instance, tickers: next },
          },
        };
      }),

    clearTickers: (dashboardId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        localStorage.setItem(tickersKey(dashboardId), JSON.stringify([]));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: { ...instance, tickers: [] },
          },
        };
      }),

    updatePanelLayouts: (dashboardId, layouts) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;

        const overrides: Record<string, PanelLayout> = {};
        const nextPanels = instance.dashboard.panels.map((p) => {
          const layout = layouts.find((l) => l.i === p.id);
          if (layout) {
            const newLayout = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
            overrides[p.id] = newLayout;
            return { ...p, layout: newLayout };
          }
          return p;
        });

        const nextGroups = (instance.dashboard.groups || []).map((g) => {
          const layout = layouts.find((l) => l.i === g.id);
          if (layout) {
            const newLayout = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
            overrides[g.id] = newLayout;
            return { ...g, layout: newLayout };
          }
          return g;
        });

        localStorage.setItem(layoutsKey(dashboardId), JSON.stringify(overrides));

        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: { ...instance.dashboard, panels: nextPanels, groups: nextGroups },
            },
          },
        };
      }),

    addPanel: (dashboardId, panel) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: {
                ...instance.dashboard,
                panels: [...instance.dashboard.panels, panel],
              },
            },
          },
        };
      }),

    removePanel: (dashboardId, panelId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: {
                ...instance.dashboard,
                panels: instance.dashboard.panels.filter((p) => p.id !== panelId),
              },
            },
          },
        };
      }),

    toggleGroupCollapse: (dashboardId, groupId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        const nextGroups = (instance.dashboard.groups || []).map((g) =>
          g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
        );
        const collapseState: Record<string, boolean> = {};
        nextGroups.forEach((g) => {
          collapseState[g.id] = g.collapsed ?? false;
        });
        localStorage.setItem(collapseKey(dashboardId), JSON.stringify(collapseState));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: { ...instance.dashboard, groups: nextGroups },
            },
          },
        };
      }),

    movePanelToGroup: (dashboardId, panelId, groupId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        const nextPanels = instance.dashboard.panels.map((p) =>
          p.id === panelId ? { ...p, groupId } : p
        );
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: { ...instance.dashboard, panels: nextPanels },
            },
          },
        };
      }),

    createGroup: (dashboardId, group) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        const nextGroups = [...(instance.dashboard.groups || []), group];
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: { ...instance.dashboard, groups: nextGroups },
            },
          },
        };
      }),

    removeGroup: (dashboardId, groupId) =>
      set((state) => {
        const instance = state.dashboards[dashboardId];
        if (!instance) return state;
        // Ungroup all panels and sub-groups that were in this group
        const nextPanels = instance.dashboard.panels.map((p) =>
          p.groupId === groupId ? { ...p, groupId: null } : p
        );
        const nextGroups = (instance.dashboard.groups || [])
          .filter((g) => g.id !== groupId)
          .map((g) => (g.groupId === groupId ? { ...g, groupId: null } : g));
        return {
          dashboards: {
            ...state.dashboards,
            [dashboardId]: {
              ...instance,
              dashboard: { ...instance.dashboard, panels: nextPanels, groups: nextGroups },
            },
          },
        };
      }),
  }))
);

export function useDashboard(dashboardId: string) {
  const instance = useDashboardStore((state) => state.dashboards[dashboardId]);
  const initDashboard = useDashboardStore((state) => state.initDashboard);

  return useMemo(
    () => ({
      dashboard: instance?.dashboard,
      tickers: instance?.tickers ?? [],
      globalRefreshKey: instance?.globalRefreshKey ?? 0,
      panelRefreshKeys: instance?.panelRefreshKeys ?? {},
      initDashboard,
      refreshAll: () => useDashboardStore.getState().refreshAll(dashboardId),
      refreshPanel: (panelId: string) => useDashboardStore.getState().refreshPanel(dashboardId, panelId),
      addTicker: (ticker: string) => useDashboardStore.getState().addTicker(dashboardId, ticker),
      removeTicker: (ticker: string) => useDashboardStore.getState().removeTicker(dashboardId, ticker),
      clearTickers: () => useDashboardStore.getState().clearTickers(dashboardId),
      updatePanelLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) =>
        useDashboardStore.getState().updatePanelLayouts(dashboardId, layouts),
      addPanel: (panel: PanelConfig) => useDashboardStore.getState().addPanel(dashboardId, panel),
      removePanel: (panelId: string) => useDashboardStore.getState().removePanel(dashboardId, panelId),
      toggleGroupCollapse: (groupId: string) => useDashboardStore.getState().toggleGroupCollapse(dashboardId, groupId),
      movePanelToGroup: (panelId: string, groupId: string | null) => useDashboardStore.getState().movePanelToGroup(dashboardId, panelId, groupId),
      createGroup: (group: GroupConfig) => useDashboardStore.getState().createGroup(dashboardId, group),
      removeGroup: (groupId: string) => useDashboardStore.getState().removeGroup(dashboardId, groupId),
    }),
    [instance, initDashboard, dashboardId]
  );
}

export function serializeDashboardYaml(dashboard: DashboardYAML): string {
  const doc = {
    id: dashboard.id,
    name: dashboard.name,
    filters: dashboard.filters,
    groups: (dashboard.groups || []).map((g) => ({
      id: g.id,
      type: g.type || '__group__',
      title: g.title,
      layout: g.layout,
      collapsed: g.collapsed,
      group: g.groupId,
    })),
    panels: dashboard.panels.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      layout: p.layout,
      group: p.groupId,
      inputs: mapKeysToSnakeCase(p.inputs || {}),
      refresh_interval: p.refreshInterval || 0,
    })),
  };
  return yaml.dump(doc);
}
