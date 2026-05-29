import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, X, LayoutGrid } from "lucide-react";
import { useDashboard, parseDashboardYaml, serializeDashboardYaml } from "../stores/useDashboardStore";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { useDisabledTickers } from "../hooks/useDisabledTickers";
import { useEditMode } from "../hooks/useEditMode";
import { dataApi } from "../lib/api";
import type { PanelConfig } from "../lib/api";
import { addMyDashboard } from "../lib/myDashboards";
import { getAllPanelTypes } from "../panels/core/registry";
import type { PanelDefinition } from "../panels/core/types";

import DashboardGrid from "../components/DashboardGrid";
import TickerFilterBar from "../components/TickerFilterBar";

interface DashboardPageProps {
  staticYaml?: string;
  overrideId?: string;
  defaultTimeRange?: string;
  extraHeader?: React.ReactNode;
}

export default function DashboardPage({ staticYaml, overrideId, defaultTimeRange, extraHeader }: DashboardPageProps) {
  const params = useParams();

  const dashboardId = overrideId || params.id || "unknown";
  const storagePrefix = `dashboard_${dashboardId}`;

  const [, setYaml] = useState<string | undefined>(staticYaml);
  const [loading, setLoading] = useState(!staticYaml);
  const [error, setError] = useState<string | null>(null);

  const {
    dashboard,
    tickers,
    globalRefreshKey,
    panelRefreshKeys,
    initDashboard,
    refreshAll,
    refreshPanel,
    addTicker,
    removeTicker,
    clearTickers,
    updatePanelLayouts,
    addPanel,
    removePanel,
  } = useDashboard(dashboardId);

  // Load dashboard YAML
  useEffect(() => {
    if (staticYaml) {
      initDashboard(parseDashboardYaml(staticYaml));
      return;
    }

    if (!params.id) return;
    setLoading(true);
    dataApi.getDashboard(params.id)
      .then((record) => {
        setYaml(record.yaml);
        const parsed = parseDashboardYaml(record.yaml);
        parsed.id = params.id!;
        initDashboard(parsed);
        addMyDashboard(params.id!);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [staticYaml, params.id, initDashboard]);

  const {
    disabledTickers,
    handleTickerClick,
    showAll,
    hideAll,
    remove: removeDisabled,
    enabledTickers,
  } = useDisabledTickers(`${storagePrefix}_disabled`);

  const { isEditMode, setIsEditMode } = useEditMode(`${storagePrefix}_edit_mode`);

  const search = useTickerSearch({
    existingTickers: tickers,
    onSelect: (symbol) => {
      addTicker(symbol);
    },
  });

  const handleRemoveTicker = (symbol: string) => {
    removeTicker(symbol);
    removeDisabled(symbol);
  };

  const enabled = enabledTickers(tickers);

  const [timeRange] = useState(defaultTimeRange || "1y");

  // Add panel modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availablePanels, setAvailablePanels] = useState<PanelDefinition[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    if (!showAddModal) return;
    setPanelLoading(true);
    getAllPanelTypes()
      .then((panels) => {
        setAvailablePanels(panels);
        setPanelLoading(false);
      })
      .catch(() => setPanelLoading(false));
  }, [showAddModal]);

  const handleAddPanel = (def: PanelDefinition) => {
    if (!dashboard) return;
    const bottomY = dashboard.panels.reduce((max, p) => Math.max(max, p.layout.y + p.layout.h), 0);
    const panel: PanelConfig = {
      id: `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: def.id,
      title: def.name,
      layout: { x: 0, y: bottomY, w: 6, h: 10 },
      inputs: {},
      refreshInterval: 0,
    };
    addPanel(panel);
    setShowAddModal(false);
    saveDashboard([...dashboard.panels, panel]);
  };

  const handleRemovePanel = (panelId: string) => {
    if (!dashboard) return;
    if (!confirm("Remove this panel?")) return;
    removePanel(panelId);
    const nextPanels = dashboard.panels.filter((p) => p.id !== panelId);
    saveDashboard(nextPanels);
  };

  const saveDashboard = async (panels: PanelConfig[]) => {
    if (!dashboard || !params.id) return;
    const updated: typeof dashboard = { ...dashboard, panels };
    const yamlString = serializeDashboardYaml(updated);
    try {
      await dataApi.updateDashboard(params.id, dashboard.name, yamlString);
    } catch (e: any) {
      console.error("Failed to save dashboard:", e);
      alert("Failed to save dashboard: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-red-500">Failed to load dashboard: {error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Dashboard not found</div>
      </div>
    );
  }

  const categories = Array.from(new Set(availablePanels.map((p) => p.category)));

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-1.5 flex items-center gap-2">
        <h1 className="text-sm font-bold text-gray-900">{dashboard.name}</h1>
      </div>
      <TickerFilterBar
        tickers={tickers}
        disabledTickers={disabledTickers}
        onTickerClick={(sym) => handleTickerClick(sym, tickers)}
        onRemoveTicker={handleRemoveTicker}
        onShowAll={showAll}
        onHideAll={() => hideAll(tickers)}
        onClear={clearTickers}
        onRefreshAll={refreshAll}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((prev: boolean) => !prev)}
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        searchResults={search.searchResults}
        searchLoading={search.searchLoading}
        showDropdown={search.showDropdown}
        onShowDropdown={search.setShowDropdown}
        onSelectSearchResult={search.handleSelect}
        searchRef={search.searchRef}
        extraControls={extraHeader}
        onAddPanel={isEditMode ? () => setShowAddModal(true) : undefined}
      />

      <DashboardGrid
        panels={dashboard.panels}
        filters={{ tickers, enabledTickers: enabled, timeRange }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
        onLayoutChange={updatePanelLayouts}
        isEditMode={isEditMode}
        onRemovePanel={handleRemovePanel}
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Plus size={14} />
                Add Panel
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {panelLoading ? (
                <div className="text-sm text-gray-500">Loading panels...</div>
              ) : (
                <div className="space-y-6">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availablePanels
                          .filter((p) => p.category === cat)
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleAddPanel(p)}
                              className="flex items-start gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              <LayoutGrid size={16} className="text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-gray-800">{p.name}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{p.description}</div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
