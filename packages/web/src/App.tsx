import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import Layout from "./components/Layout";
import MacroPage from "./pages/MacroPage";
import RrgPage from "./pages/RrgPage";
import ComparisonsPage from "./pages/ComparisonsPage";
import TickerDetailPage from "./pages/TickerDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Tooltip
        id="filter-tooltip"
        className="!bg-gray-900 !text-white !text-[11px] !px-2.5 !py-1.5 !rounded-lg !max-w-[240px] !z-[9999] !shadow-lg"
        classNameArrow="!bg-gray-900"
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MacroPage />} />
          <Route path="/rrg" element={<RrgPage />} />
          <Route path="/comparisons" element={<ComparisonsPage />} />
          <Route path="/ticker/:symbol" element={<TickerDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
