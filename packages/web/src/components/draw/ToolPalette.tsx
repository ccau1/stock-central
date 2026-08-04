import type { Tool } from "./types";
import { Pencil, Camera, X, Check } from "lucide-react";
import { LineIcon, HorizontalLineIcon, PolylineIcon } from "./icons";

interface ToolPaletteProps {
  activeTool: Tool;
  color: string;
  width: number;
  isPolylineDrafting: boolean;
  onSelectTool: (tool: Tool) => void;
  onSetColor: (color: string) => void;
  onSetWidth: (width: number) => void;
  onFinishPolyline: () => void;
  onClose: () => void;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#111827", "#ffffff"];

const TOOLS: { id: Tool; label: string; icon: React.ElementType }[] = [
  { id: "pen", label: "Pen", icon: Pencil },
  { id: "line", label: "Line", icon: LineIcon },
  { id: "polyline", label: "Dots & Lines", icon: PolylineIcon },
  { id: "horizontal", label: "Horizontal Line", icon: HorizontalLineIcon },
  { id: "screencap", label: "Screenshot", icon: Camera },
];

export default function ToolPalette({
  activeTool,
  color,
  width,
  isPolylineDrafting,
  onSelectTool,
  onSetColor,
  onSetWidth,
  onFinishPolyline,
  onClose,
}: ToolPaletteProps) {
  return (
    <div
      className="tool-palette fixed bottom-16 right-2 z-[80] flex flex-col items-center gap-2 rounded-2xl bg-gray-900/95 p-2 shadow-2xl border border-gray-700/50 backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              onClick={() => onSelectTool(tool.id)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {tool.id === "screencap" && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {activeTool === "polyline" && isPolylineDrafting && (
        <button
          type="button"
          title="Finish polyline"
          onClick={onFinishPolyline}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-600 text-white hover:bg-green-500 transition-colors"
        >
          <Check size={18} />
        </button>
      )}

      <div className="w-full h-px bg-gray-700 my-0.5" />

      <div className="grid grid-cols-2 gap-1.5 px-0.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onSetColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c ? "border-white scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.15)" : undefined }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={width}
          onChange={(e) => onSetWidth(Number(e.target.value))}
          className="w-16 accent-blue-500"
        />
        <span className="text-[10px] text-gray-400 w-3 text-center">{width}</span>
      </div>

      <div className="w-full h-px bg-gray-700 my-0.5" />

      <button
        type="button"
        title="Close overlay"
        onClick={onClose}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-800 text-gray-300 hover:bg-red-600/90 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}
