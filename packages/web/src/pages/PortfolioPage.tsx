import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Briefcase, DollarSign, PieChart } from "lucide-react";
import { dataApi } from "../lib/api";
import type { ScreenStock } from "../lib/api";

interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
}

const STORAGE_KEY = "stockcentral_portfolio";

function loadPositions(): Position[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function savePositions(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(2);
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>(loadPositions);
  const [quotes, setQuotes] = useState<Record<string, ScreenStock>>({});
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");

  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);

  const fetchQuotes = async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    try {
      const data = await dataApi.getBatchQuotes(symbols);
      const map: Record<string, ScreenStock> = {};
      for (const q of data) {
        map[q.symbol] = q;
      }
      setQuotes(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [symbols.join(",")]);

  useEffect(() => {
    savePositions(positions);
  }, [positions]);

  const handleAdd = () => {
    const sym = newSymbol.trim().toUpperCase();
    const shares = parseFloat(newShares);
    const cost = parseFloat(newCost);
    if (!sym || isNaN(shares) || shares <= 0 || isNaN(cost) || cost <= 0) return;

    setPositions((prev) => {
      const existing = prev.find((p) => p.symbol === sym);
      if (existing) {
        // Update average cost
        const totalShares = existing.shares + shares;
        const totalCost = existing.shares * existing.avgCost + shares * cost;
        return prev.map((p) =>
          p.symbol === sym
            ? { ...p, shares: totalShares, avgCost: totalCost / totalShares }
            : p
        );
      }
      return [...prev, { id: `${sym}-${Date.now()}`, symbol: sym, shares, avgCost: cost }];
    });

    setNewSymbol("");
    setNewShares("");
    setNewCost("");
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const summary = useMemo(() => {
    let totalCost = 0;
    let totalValue = 0;
    for (const p of positions) {
      const q = quotes[p.symbol];
      const price = q?.price ?? 0;
      totalCost += p.shares * p.avgCost;
      totalValue += p.shares * price;
    }
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    return { totalCost, totalValue, pnl, pnlPct };
  }, [positions, quotes]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Briefcase size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Tracker</h1>
            <p className="text-xs text-gray-500">Manage positions and track P&L</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            <Plus size={12} />
            Add Position
          </button>
          <button
            onClick={fetchQuotes}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Total Value</div>
          <div className="text-sm font-bold text-gray-900">{formatCurrency(summary.totalValue)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Total Cost</div>
          <div className="text-sm font-bold text-gray-900">{formatCurrency(summary.totalCost)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Unrealized P&L</div>
          <div className={`text-sm font-bold flex items-center gap-0.5 ${summary.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
            {summary.pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatCurrency(summary.pnl)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Return %</div>
          <div className={`text-sm font-bold ${summary.pnlPct >= 0 ? "text-green-600" : "text-red-600"}`}>
            {summary.pnlPct >= 0 ? "+" : ""}{summary.pnlPct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Allocation Bar */}
      {positions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-gray-500" />
            <h3 className="text-xs font-bold text-gray-900 uppercase">Allocation</h3>
          </div>
          <div className="flex h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
            {positions.map((p, i) => {
              const q = quotes[p.symbol];
              const value = q ? p.shares * q.price : 0;
              const pct = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
              const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500"];
              return (
                <div
                  key={p.id}
                  className={`h-full ${colors[i % colors.length]}`}
                  style={{ width: `${pct}%` }}
                  title={`${p.symbol}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {positions.map((p, i) => {
              const q = quotes[p.symbol];
              const value = q ? p.shares * q.price : 0;
              const pct = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
              const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500"];
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                  <span className="text-[10px] text-gray-600">{p.symbol}</span>
                  <span className="text-[10px] font-semibold text-gray-800">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Positions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase">Positions</h3>
          <span className="text-[10px] text-gray-400">{positions.length} holdings</span>
        </div>
        {positions.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={24} className="text-gray-300 mx-auto mb-2" />
            <div className="text-xs text-gray-400">No positions yet. Click "Add Position" to get started.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase">Ticker</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">Shares</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">Avg Cost</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">Price</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">Market Value</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">P&L</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right">Return</th>
                  <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase text-right"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const q = quotes[p.symbol];
                  const price = q?.price ?? 0;
                  const value = p.shares * price;
                  const cost = p.shares * p.avgCost;
                  const pnl = value - cost;
                  const pnlPct = p.avgCost > 0 ? ((price - p.avgCost) / p.avgCost) * 100 : 0;

                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-gray-900">{p.symbol}</div>
                        <div className="text-[10px] text-gray-400">{q?.name || "–"}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800">{formatCompact(p.shares)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800">${p.avgCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-800">${price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{formatCurrency(value)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold ${pnlPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Add Position</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Ticker Symbol</label>
                <input
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g. AAPL"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Shares</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Average Cost per Share</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
