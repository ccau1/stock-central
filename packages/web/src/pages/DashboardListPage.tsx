import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, LayoutDashboard, Plus, X, Pencil, EyeOff } from "lucide-react";
import yaml from "js-yaml";
import { dataApi } from "../lib/api";
import type { DashboardRecord } from "../lib/api";
import { getMyDashboardIds, setMyDashboardIds, addMyDashboard, removeMyDashboard } from "../lib/myDashboards";

const DEFAULT_YAML = `id: new-dashboard
name: New Dashboard
filters:
  tickers:
    - AAPL
    - MSFT
panels:
  - id: price-chart
    type: line-chart
    title: Price History
    layout: { x: 0, y: 0, w: 6, h: 10 }
    inputs:
      time_range: 1y
    refresh_interval: 60
`;

export default function DashboardListPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createYaml, setCreateYaml] = useState(DEFAULT_YAML);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const list = await dataApi.listDashboards();
      const myIds = getMyDashboardIds();
      // First visit: seed with all existing dashboards so the user doesn't see an empty list
      if (myIds.length === 0 && list.length > 0) {
        const allIds = list.map((d) => d.id);
        setMyDashboardIds(allIds);
        setDashboards(list);
      } else {
        setDashboards(list.filter((d) => myIds.includes(d.id)));
      }
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
    if (!confirm("Permanently delete this dashboard from the server?")) return;
    try {
      await dataApi.deleteDashboard(id);
      removeMyDashboard(id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert("Failed to delete: " + e.message);
    }
  };

  const handleRemoveFromMine = (id: string) => {
    if (!confirm("Remove this dashboard from your personal list? It will still exist on the server.")) return;
    removeMyDashboard(id);
    setDashboards((prev) => prev.filter((d) => d.id !== id));
  };

  const handleClone = async (id: string, name: string) => {
    try {
      const cloned = await dataApi.cloneDashboard(id, `${name} (Copy)`);
      addMyDashboard(cloned.id);
      setDashboards((prev) => [cloned, ...prev]);
    } catch (e: any) {
      alert("Failed to clone: " + e.message);
    }
  };

  const startEditName = (d: DashboardRecord) => {
    setEditingId(d.id);
    setEditName(d.name);
  };

  const handleSaveName = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const record = dashboards.find((d) => d.id === id);
    if (!record || trimmed === record.name) {
      setEditingId(null);
      return;
    }
    try {
      const doc = yaml.load(record.yaml) as any;
      doc.name = trimmed;
      const updatedYaml = yaml.dump(doc);
      await dataApi.updateDashboard(id, trimmed, updatedYaml);
      setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, name: trimmed, yaml: updatedYaml } : d)));
    } catch (e: any) {
      alert("Failed to rename: " + e.message);
    } finally {
      setEditingId(null);
    }
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateYaml(DEFAULT_YAML);
    setCreateError(null);
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createYaml.trim()) {
      setCreateError("Name and YAML are required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await dataApi.createDashboard(createName.trim(), createYaml.trim());
      addMyDashboard(created.id);
      setDashboards((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create dashboard.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-sm text-gray-500 mt-1">Your personal dashboards</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={12} />
              Create
            </button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading dashboards...</div>}
        {error && <div className="text-sm text-red-500">Error: {error}</div>}

        {!loading && !error && dashboards.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <LayoutDashboard size={32} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-700">No dashboards yet</h3>
            <p className="text-xs text-gray-400 mt-1">Create your first dashboard to get started.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={12} />
              Create Dashboard
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/dashboard/${d.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                {editingId === d.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveName(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName(d.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-semibold text-gray-900 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mr-2"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-900">{d.name}</span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditName(d); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClone(d.id, d.name); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Clone"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFromMine(d.id); }}
                    className="p-1 text-gray-400 hover:text-amber-600 rounded"
                    title="Remove from My Dashboards"
                  >
                    <EyeOff size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete Permanently"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Create Dashboard</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-auto p-4">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My Dashboard"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">YAML</label>
                <textarea
                  value={createYaml}
                  onChange={(e) => setCreateYaml(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
              {createError && (
                <div className="mb-3 text-xs text-red-500">{createError}</div>
              )}
            </form>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
