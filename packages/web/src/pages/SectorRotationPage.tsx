import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { dataApi } from "../lib/api";
import type { SectorRotationItem } from "../lib/api";

type SortKey = "symbol" | "name" | "1d" | "1w" | "1m" | "3m" | "6m" | "ytd";
type SortDir = "asc" | "desc";

function pct(val: number): string {
  if (!isFinite(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

export default function SectorRotationPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SectorRotationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("ytd");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dataApi.getSectorRotation();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sorted = useMemo(() => {
    const rows = [...data];
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "symbol" || sortKey === "name") {
        av = (a as any)[sortKey];
        bv = (b as any)[sortKey];
        const as = String(av || "").toLowerCase();
        const bs = String(bv || "").toLowerCase();
        return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      }
      av = a.returns[sortKey] ?? 0;
      bv = b.returns[sortKey] ?? 0;
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const periods: { key: SortKey; label: string }[] = [
    { key: "1d", label: "1D" },
    { key: "1w", label: "1W" },
    { key: "1m", label: "1M" },
    { key: "3m", label: "3M" },
    { key: "6m", label: "6M" },
    { key: "ytd", label: "YTD" },
  ];

  // Compute max absolute return for sparkline scaling
  const maxAbs = useMemo(() => {
    let m = 1;
    data.forEach((d) => {
      periods.forEach((p) => {
        const v = Math.abs(d.returns[p.key] ?? 0);
        if (v > m) m = v;
      });
    });
    return m;
  }, [data]);

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Sector Rotation</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th
                  className="px-3 py-2 font-semibold text-gray-600 border-b border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("name")}
                >
                  <span className="inline-flex items-center gap-0.5">
                    Sector
                    {sortKey === "name" ? (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="text-gray-300" />}
                  </span>
                </th>
                {periods.map((p) => (
                  <th
                    key={p.key}
                    className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(p.key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {p.label}
                      {sortKey === p.key ? (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="text-gray-300" />}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold text-gray-600 border-b border-gray-200 text-left">Trend</th>
              </tr>
            </thead>
            <tbody>
              {loading && sorted.length === 0 ? (
                <tr><td colSpan={periods.length + 2} className="text-center py-12 text-gray-400"><RefreshCw size={16} className="animate-spin inline mr-2" />Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={periods.length + 2} className="text-center py-12 text-gray-400">No data available</td></tr>
              ) : (
                sorted.map((row) => (
                  <tr
                    key={row.symbol}
                    onClick={() => navigate(`/ticker/${row.symbol}`)}
                    className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-800">{row.name}</div>
                      <div className="text-[10px] text-gray-400">{row.symbol}</div>
                    </td>
                    {periods.map((p) => {
                      const v = row.returns[p.key] ?? 0;
                      return (
                        <td key={p.key} className={`px-2 py-2 text-right font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {pct(v)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <div className="flex items-end gap-px h-6 w-20">
                        {periods.map((p) => {
                          const v = row.returns[p.key] ?? 0;
                          const h = (Math.abs(v) / maxAbs) * 100;
                          return (
                            <div
                              key={p.key}
                              className={`flex-1 rounded-sm ${v >= 0 ? "bg-green-400" : "bg-red-400"}`}
                              style={{ height: `${Math.max(h, 4)}%` }}
                              title={`${p.label}: ${pct(v)}`}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
