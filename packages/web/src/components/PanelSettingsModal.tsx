import { useState } from "react";
import { X } from "lucide-react";
import type { PanelConfig, DashboardVariable } from "../lib/api";
import type { PanelDefinition, PanelSettingField } from "../panels/_core/types";
import { isCompactQuery, parseCompactQuery } from "../lib/query/compact";

interface PanelSettingsModalProps {
  panel: PanelConfig;
  panelDefinition: PanelDefinition | undefined;
  dashboardVariables?: DashboardVariable[];
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

function getInitialValue(field: PanelSettingField, panelInputs: Record<string, unknown>): unknown {
  const value = panelInputs?.[field.key];
  if (value !== undefined) return value;
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
      return "";
    case "query-editor":
      return { source: "price_history", params: {} };
    case "chart-editor":
      return { type: "line" };
    default:
      return "";
  }
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function PanelSettingsModal({ panel, panelDefinition, dashboardVariables, onSave, onClose }: PanelSettingsModalProps) {
  const settings = panelDefinition?.settings || [];
  const initialInputs: Record<string, unknown> = {};
  for (const field of settings) {
    initialInputs[field.key] = getInitialValue(field, panel.inputs || {});
  }
  const [inputs, setInputs] = useState<Record<string, unknown>>(initialInputs);
  const [title, setTitle] = useState(panel.title || "");
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const derivedTitle = getDerivedTitle(inputs, settings);

  const setField = (key: string, value: unknown) => {
    const next = { ...inputs, [key]: value };
    setInputs(next);
  };

  const handleMetricChange = (value: string) => {
    const next = { ...inputs, metric: value };
    setInputs(next);
    const nextDerived = getDerivedTitle(next, settings);
    if (nextDerived && (title === derivedTitle || title === "")) {
      setTitle(nextDerived);
    }
  };

  const handleSave = () => {
    if (Object.keys(jsonErrors).length > 0) return;
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Panel Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
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
              <SettingFieldInput
                field={field}
                value={inputs[field.key]}
                onChange={(value) => setField(field.key, value)}
                onMetricChange={field.key === "metric" ? handleMetricChange : undefined}
                jsonError={jsonErrors[field.key]}
                setJsonError={(err) => setJsonErrors((prev) => ({ ...prev, [field.key]: err }))}
                dashboardVariables={dashboardVariables}
              />
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
            disabled={Object.keys(jsonErrors).some((k) => jsonErrors[k])}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingFieldInputProps {
  field: PanelSettingField;
  value: unknown;
  onChange: (value: unknown) => void;
  onMetricChange?: (value: string) => void;
  jsonError?: string;
  setJsonError: (error: string) => void;
  dashboardVariables?: DashboardVariable[];
}

function SettingFieldInput({ field, value, onChange, onMetricChange, jsonError, setJsonError, dashboardVariables }: SettingFieldInputProps) {
  switch (field.type) {
    case "select":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            if (onMetricChange) {
              onMetricChange(e.target.value);
            } else {
              onChange(e.target.value);
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
      );

    case "text":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            onChange(v);
          }}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">{field.label}</span>
        </label>
      );

    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={typeof value === "string" ? value : "#3b82f6"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded border border-gray-200 p-0.5"
          />
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case "query-editor":
    case "chart-editor":
    case "code":
      return (
        <div>
          <textarea
            value={stringify(value)}
            onChange={(e) => {
              const text = e.target.value;
              if (text.trim() === "") {
                setJsonError("");
                onChange(field.type === "query-editor" ? { source: "", params: {} } : field.type === "chart-editor" ? { type: "" } : "");
                return;
              }

              // Query editor accepts compact Grafana-style strings like
              // price_history{symbol: $enabledTickers, range: $timeRange}
              if (field.type === "query-editor" && isCompactQuery(text)) {
                try {
                  parseCompactQuery(text);
                  setJsonError("");
                  onChange(text.trim());
                } catch (err) {
                  setJsonError(err instanceof Error ? err.message : "Invalid compact query");
                }
                return;
              }

              try {
                const parsed = JSON.parse(text);
                setJsonError("");
                onChange(parsed);
              } catch {
                setJsonError(field.type === "query-editor" ? "Invalid JSON or compact query" : "Invalid JSON");
              }
            }}
            spellCheck={false}
            rows={field.type === "query-editor" || field.type === "chart-editor" ? 12 : 8}
            className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.type === "query-editor" ? 'price_history{symbol: $enabledTickers, range: $timeRange}\n\n# expression shorthand (named queries):\n{\n  "expr": "price - sma20",\n  "queries": {\n    "price": "price_history{symbol: AAPL, range: $timeRange, close_only: true}",\n    "sma20": "formula{symbol: AAPL, expression: \\"sma(20, close())\\", range: $timeRange}"\n  }\n}\n\n# inline compact queries in an expression:\n{\n  "expr": "price_history{symbol: AAPL, range: $timeRange, close_only: true} - formula{symbol: AAPL, expression: \\"sma(20, close())\\", range: $timeRange}"\n}' : field.type === "chart-editor" ? '{\n  "type": "line",\n  "x": "date"\n}' : ""}
          />
          {jsonError && <p className="mt-1 text-xs text-red-500">{jsonError}</p>}
          {field.type === "query-editor" && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              Compact: <code className="text-slate-300">source&#123;key: value, ...&#125;</code>.{" "}
              Variables: <code className="text-slate-300">$tickers</code>,{" "}
              <code className="text-slate-300">$enabledTickers</code>,{" "}
              <code className="text-slate-300">$timeRange</code>,{" "}
              <code className="text-slate-300">$country</code>
              {dashboardVariables && dashboardVariables.length > 0 && (
                <>, {dashboardVariables.map((v, i) => (
                  <span key={v.name}>
                    {i === 0 ? "" : ", "}
                    <code className="text-slate-300">${v.name}</code>
                  </span>
                ))}</>
              )}
              . Formats: <code className="text-slate-300">:csv</code>, <code className="text-slate-300">:json</code>,{" "}
              <code className="text-slate-300">:pipe</code>, <code className="text-slate-300">:space</code>.
            </p>
          )}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={stringify(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
  }
}
