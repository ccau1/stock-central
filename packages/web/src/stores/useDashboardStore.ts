import { create } from "zustand";
import { devtools } from "zustand/middleware";
import yaml from "js-yaml";
import type { DashboardYAML, PanelLayout } from "../lib/api";

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapKeysToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
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
    panels: (doc.panels || []).map((p: any) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      layout: p.layout,
      inputs: mapKeysToCamelCase(p.inputs || {}),
      refreshInterval: p.refresh_interval || 0,
    })),
  };
}

function tickersKey(dashboardId: string): string {
  return dashboardId === "macro" ? "stockcentral_tickers" : `stockcentral_${dashboardId}_tickers`;
}

function layoutsKey(dashboardId: string): string {
  return dashboardId === "macro" ? "stockcentral_layouts" : `stockcentral_${dashboardId}_layouts`;
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

function applyLayoutOverrides(dashboard: DashboardYAML): DashboardYAML {
  const overrides = getSavedLayouts(dashboard.id);
  if (Object.keys(overrides).length === 0) return dashboard;
  return {
    ...dashboard,
    panels: dashboard.panels.map((p) =>
      overrides[p.id] ? { ...p, layout: overrides[p.id] } : p
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
  updatePanelLayouts: (dashboardId: string, layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools((set) => ({
    dashboards: {},

    initDashboard: (yaml) =>
      set((state) => {
        if (state.dashboards[yaml.id]) return state;
        const dashboard = applyLayoutOverrides(yaml);
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

        localStorage.setItem(layoutsKey(dashboardId), JSON.stringify(overrides));

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
  }))
);

export function useDashboard(dashboardId: string) {
  const instance = useDashboardStore((state) => state.dashboards[dashboardId]);
  const initDashboard = useDashboardStore((state) => state.initDashboard);

  return {
    dashboard: instance?.dashboard,
    tickers: instance?.tickers ?? [],
    globalRefreshKey: instance?.globalRefreshKey ?? 0,
    panelRefreshKeys: instance?.panelRefreshKeys ?? {},
    initDashboard,
    refreshAll: () => useDashboardStore.getState().refreshAll(dashboardId),
    refreshPanel: (panelId: string) => useDashboardStore.getState().refreshPanel(dashboardId, panelId),
    addTicker: (ticker: string) => useDashboardStore.getState().addTicker(dashboardId, ticker),
    removeTicker: (ticker: string) => useDashboardStore.getState().removeTicker(dashboardId, ticker),
    updatePanelLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) =>
      useDashboardStore.getState().updatePanelLayouts(dashboardId, layouts),
  };
}
