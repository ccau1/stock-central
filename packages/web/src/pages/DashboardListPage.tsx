import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, LayoutDashboard, Plus, X, Pencil, EyeOff, Search, Import, Info } from "lucide-react";
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

const PAGE_SIZE = 20;

const encodeCursor = (d: DashboardRecord): string => {
  return btoa(JSON.stringify({ u: d.updated_at, i: d.id }));
};

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

  const [searchQuery, setSearchQuery] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importIds, setImportIds] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadDashboards = useCallback(async ({ after, reset }: { after?: string; reset?: boolean } = {}) => {
    if (reset) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const myIds = getMyDashboardIds();
      let list: DashboardRecord[];
      let seeded = false;

      if (myIds.length === 0 && !after) {
        // First visit: seed with all existing dashboards so the user doesn't see an empty list
        list = (await dataApi.listDashboards()) ?? [];
        if (list.length > 0) {
          setMyDashboardIds(list.map((d) => d.id));
          seeded = true;
        }
      } else {
        list = (await dataApi.listDashboards({ ids: myIds, after, limit: PAGE_SIZE })) ?? [];
      }

      if (reset) {
        setDashboards(list);
      } else {
        setDashboards((prev) => [...prev, ...list]);
      }

      if (seeded || list.length < PAGE_SIZE) {
        setHasMore(false);
        setAfterCursor(null);
      } else {
        setHasMore(true);
        setAfterCursor(encodeCursor(list[list.length - 1]));
      }
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboards({ reset: true });
  }, [loadDashboards]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && afterCursor) {
          loadDashboards({ after: afterCursor });
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, isLoadingMore, afterCursor, loadDashboards]);

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this dashboard from the server?")) return;
    try {
      await dataApi.deleteDashboard(id);
      removeMyDashboard(id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch (e: unknown) {
      alert("Failed to delete: " + (e instanceof Error ? e.message : String(e)));
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
    } catch (e: unknown) {
      alert("Failed to clone: " + (e instanceof Error ? e.message : String(e)));
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
      const doc = yaml.load(record.yaml) as { name?: string; [key: string]: unknown };
      doc.name = trimmed;
      const updatedYaml = yaml.dump(doc);
      await dataApi.updateDashboard(id, trimmed, updatedYaml);
      setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, name: trimmed, yaml: updatedYaml } : d)));
    } catch (e: unknown) {
      alert("Failed to rename: " + (e instanceof Error ? e.message : String(e)));
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

  const openImportModal = () => {
    setImportIds("");
    setImportError(null);
    setShowImportModal(true);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = importIds
      .split(/\n/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      setImportError("Please enter at least one dashboard ID.");
      return;
    }

    const existing = new Set(getMyDashboardIds());
    let added = 0;
    ids.forEach((id) => {
      if (!existing.has(id)) {
        addMyDashboard(id);
        existing.add(id);
        added++;
      }
    });

    if (added === 0) {
      setImportError("All entered dashboard IDs are already in your list.");
      return;
    }

    setShowImportModal(false);
    setImportIds("");
    setImportError(null);
    loadDashboards({ reset: true });
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
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create dashboard.");
    } finally {
      setCreating(false);
    }
  };

  const filteredDashboards = dashboards.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-sm text-gray-500 mt-1">Your personal dashboards</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dashboards..."
                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button
              onClick={openImportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Import size={12} />
              Import
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={12} />
              Create
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            Your dashboard list is stored only in this browser. Switching browsers or devices will not show your dashboards here. Use Import to add dashboards by ID on another browser.
          </p>
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

        {!loading && !error && dashboards.length > 0 && filteredDashboards.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Search size={32} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-700">No dashboards match</h3>
            <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((d) => (
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

        {isLoadingMore && (
          <div className="mt-4 text-center text-xs text-gray-500">Loading more dashboards...</div>
        )}

        <div ref={sentinelRef} className="h-4" />
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Import Dashboards</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleImport} className="flex-1 overflow-auto p-4">
              <p className="text-xs text-gray-500 mb-3">
                Enter dashboard IDs below, one per line. They will be added to your personal list in this browser.
              </p>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dashboard IDs</label>
                <textarea
                  value={importIds}
                  onChange={(e) => setImportIds(e.target.value)}
                  rows={8}
                  placeholder="e.g.&#10;550e8400-e29b-41d4-a716-446655440000&#10;6ba7b810-9dad-11d1-80b4-00c04fd430c8"
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
              {importError && (
                <div className="mb-3 text-xs text-red-500">{importError}</div>
              )}
            </form>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
