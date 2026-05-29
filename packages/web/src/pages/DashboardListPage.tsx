import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Trash2, LayoutDashboard, RefreshCw } from "lucide-react";
import { dataApi } from "../lib/api";
import type { DashboardRecord } from "../lib/api";

export default function DashboardListPage() {
  const [dashboards, setDashboards] = useState<DashboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const list = await dataApi.listDashboards();
      setDashboards(list);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dashboard?")) return;
    try {
      await dataApi.deleteDashboard(id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert("Failed to delete: " + e.message);
    }
  };

  const handleClone = async (id: string, name: string) => {
    try {
      const cloned = await dataApi.cloneDashboard(id, `${name} (Copy)`);
      setDashboards((prev) => [cloned, ...prev]);
    } catch (e: any) {
      alert("Failed to clone: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and explore your dashboards</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboards}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              <LayoutDashboard size={12} />
              Macro
            </Link>
            <Link
              to="/comparisons"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              <LayoutDashboard size={12} />
              Comparisons
            </Link>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading dashboards...</div>}
        {error && <div className="text-sm text-red-500">Error: {error}</div>}

        {!loading && !error && dashboards.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <LayoutDashboard size={32} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-700">No dashboards yet</h3>
            <p className="text-xs text-gray-400 mt-1">Create your first dashboard to get started.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <Link
                  to={`/dashboard/${d.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-700"
                >
                  {d.name}
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleClone(d.id, d.name)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Clone"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-gray-400">
                Updated {new Date(d.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
