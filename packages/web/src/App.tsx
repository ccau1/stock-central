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
import ScreenerPage from "./pages/ScreenerPage";
import SectorRotationPage from "./pages/SectorRotationPage";
import EarningsCalendarPage from "./pages/EarningsCalendarPage";
import WatchlistPage from "./pages/WatchlistPage";
import PortfolioPage from "./pages/PortfolioPage";
import RealEstateUsPage from "./pages/RealEstateUsPage";
import MonthlyReturnsPage from "./pages/MonthlyReturnsPage";
import CompoundCalculatorPage from "./pages/CompoundCalculatorPage";
import MortgageCalculatorPage from "./pages/MortgageCalculatorPage";
import EducationPage from "./pages/EducationPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <MacroPage /> },
      { path: "/rrg", element: <RrgPage /> },
      { path: "/comparisons", element: <ComparisonsPage /> },
      { path: "/ticker/:symbol", element: <TickerDetailPage /> },
      { path: "/heatmap", element: <HeatmapPage /> },
      { path: "/screener", element: <ScreenerPage /> },
      { path: "/sector-rotation", element: <SectorRotationPage /> },
      { path: "/earnings", element: <EarningsCalendarPage /> },
      { path: "/watchlist", element: <WatchlistPage /> },
      { path: "/portfolio", element: <PortfolioPage /> },
      { path: "/real-estate-us", element: <RealEstateUsPage /> },
      { path: "/monthly-returns", element: <MonthlyReturnsPage /> },
      { path: "/calculators/compound-calculator", element: <CompoundCalculatorPage /> },
      { path: "/calculators/mortgage-calculator", element: <MortgageCalculatorPage /> },
      { path: "/education", element: <EducationPage /> },
      { path: "/education/:slug", element: <EducationPage /> },
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
