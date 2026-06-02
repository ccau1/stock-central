import { useEffect, useState } from "react";
import { X, Image, Loader2 } from "lucide-react";
import type { PanelDefinition, PanelPreview } from "../panels/_core/types";

interface PanelPreviewModalProps {
  panel: PanelDefinition | null;
  onClose: () => void;
}

export default function PanelPreviewModal({ panel, onClose }: PanelPreviewModalProps) {
  const [preview, setPreview] = useState<PanelPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  useEffect(() => {
    if (!panel?.preview) {
      setPreview(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedAsset(null);
    panel
      .preview()
      .then((p) => {
        setPreview(p);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load preview");
        setLoading(false);
      });
  }, [panel]);

  if (!panel) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">{panel.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            {preview?.description || panel.description}
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Loading preview...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 text-center py-4">{error}</div>
          )}

          {!loading && !error && preview && preview.assets.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">
              No preview images available.
            </div>
          )}

          {!loading && !error && preview && preview.assets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {preview.assets.map((asset, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAsset(asset)}
                  className="relative group rounded-lg border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors text-left"
                >
                  <img
                    src={asset}
                    alt={`${panel.name} preview ${i + 1}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for selected asset */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <button
            onClick={() => setSelectedAsset(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded"
          >
            <X size={20} />
          </button>
          <img
            src={selectedAsset}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
