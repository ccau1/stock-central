import { useEffect, useState } from "react";
import { RefreshCw, Lock, Unlock } from "lucide-react";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { useEditMode } from "../hooks/useEditMode";
import { useExpandedPanel } from "../hooks/useExpandedPanel";
import DashboardGrid from "../components/DashboardGrid";
import { ExpandedPanelModal } from "../components/ExpandedPanelModal";
import realEstateUsYaml from "../real-estate-us.yaml?raw";

const STATIC_DASHBOARD = parseDashboardYaml(realEstateUsYaml);

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
];

export default function RealEstateUsPage() {
  const {
    dashboard,
    tickers,
    globalRefreshKey,
    panelRefreshKeys,
    initDashboard,
    refreshAll,
    refreshPanel,
    updatePanelLayouts,
    toggleGroupCollapse,
    movePanelToGroup,
  } = useDashboard("real-estate-us");

  useEffect(() => {
    initDashboard(STATIC_DASHBOARD);
  }, [initDashboard]);

  const [country, setCountry] = useState<string>("US");
  const { isEditMode, setIsEditMode } = useEditMode("real_estate_us_edit_mode");
  const { expandedPanel, setExpandedPanel } = useExpandedPanel(dashboard?.panels);

  if (!dashboard) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Country:</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditMode((prev: boolean) => !prev)}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isEditMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={isEditMode ? "Disable edit mode" : "Enable edit mode"}
          >
            {isEditMode ? <Unlock size={12} /> : <Lock size={12} />}
            <span className="hidden sm:inline">{isEditMode ? "Edit On" : "Edit Off"}</span>
          </button>

          <button
            onClick={refreshAll}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            title="Refresh All"
          >
            <RefreshCw size={12} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <DashboardGrid
        panels={dashboard.panels}
        groups={dashboard.groups || []}
        filters={{ tickers, enabledTickers: tickers, country }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
        onLayoutChange={updatePanelLayouts}
        onToggleGroupCollapse={toggleGroupCollapse}
        onUpdatePanelLayout={(layout) => updatePanelLayouts([layout])}
        onMovePanelToGroup={movePanelToGroup}
        isEditMode={isEditMode}
        onExpandPanel={setExpandedPanel}
      />

      <ExpandedPanelModal
        panel={expandedPanel}
        onClose={() => setExpandedPanel(null)}
        filters={{ tickers, enabledTickers: tickers, country }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
      />
    </div>
  );
}
