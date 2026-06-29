import { useState } from "react";
import { X } from "lucide-react";
import type { PanelConfig } from "../lib/api";
import type { PanelDefinition, PanelSettingField } from "../panels/_core/types";

interface PanelSettingsModalProps {
  panel: PanelConfig;
  panelDefinition: PanelDefinition | undefined;
  onSave: (panelId: string, updates: Partial<PanelConfig>) => void;
  onClose: () => void;
}

function getDerivedTitle(inputs: Record<string, unknown>, settings?: PanelSettingField[]): string {
  if (!settings) return "";
  const metric = inputs.metric;
  if (typeof metric === "string") {
    const field = settings.find((s) => s.key === "metric");
    if (field?.type === "select") {
      const option = field.options.find((o) => o.value === metric);
      if (option) return option.label;
    }
  }
  return "";
}

export function PanelSettingsModal({ panel, panelDefinition, onSave, onClose }: PanelSettingsModalProps) {
  const settings = panelDefinition?.settings || [];
  const initialInputs: Record<string, string> = {};
  for (const field of settings) {
    const value = panel.inputs?.[field.key];
    initialInputs[field.key] = typeof value === "string" ? value : "";
  }
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs);
  const [title, setTitle] = useState(panel.title || "");

  const derivedTitle = getDerivedTitle(inputs, settings);

  const handleMetricChange = (value: string) => {
    const next = { ...inputs, metric: value };
    setInputs(next);
    const nextDerived = getDerivedTitle(next, settings);
    if (nextDerived && (title === derivedTitle || title === "")) {
      setTitle(nextDerived);
    }
  };

  const handleSave = () => {
    onSave(panel.id, {
      title: title.trim() || derivedTitle || panel.title,
      inputs,
    });
    onClose();
  };

  if (settings.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Panel Settings</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-500">This panel has no configurable settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Panel Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={derivedTitle || panel.title}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {settings.map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => {
                    if (field.key === "metric") {
                      handleMetricChange(e.target.value);
                    } else {
                      setInputs({ ...inputs, [field.key]: e.target.value });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
