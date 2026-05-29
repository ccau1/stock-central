import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import Layout from "./components/Layout";
import MacroPage from "./pages/MacroPage";
import RrgPage from "./pages/RrgPage";
import ComparisonsPage from "./pages/ComparisonsPage";
import TickerDetailPage from "./pages/TickerDetailPage";
import HeatmapPage from "./pages/HeatmapPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardListPage from "./pages/DashboardListPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <MacroPage /> },
      { path: "/rrg", element: <RrgPage /> },
      { path: "/comparisons", element: <ComparisonsPage /> },
      { path: "/ticker/:symbol", element: <TickerDetailPage /> },
      { path: "/heatmap", element: <HeatmapPage /> },
      { path: "/dashboards", element: <DashboardListPage /> },
      { path: "/dashboard/:id", element: <DashboardPage /> },
    ],
  },
]);

function App() {
  return (
    <>
      <Tooltip
        id="filter-tooltip"
        className="!bg-gray-900 !text-white !text-[11px] !px-2.5 !py-1.5 !rounded-lg !max-w-[240px] !z-[9999] !shadow-lg"
        classNameArrow="!bg-gray-900"
      />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
