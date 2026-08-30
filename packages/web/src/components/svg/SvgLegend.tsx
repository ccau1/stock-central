export interface SvgLegendItem {
  key: string;
  label: string;
  color: string;
  marker?: "circle" | "line" | "square";
}

interface SvgLegendProps {
  items: SvgLegendItem[];
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
  className?: string;
}

export function SvgLegend({ items, hoveredKey, onHover, className = "" }: SvgLegendProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {items.map((item) => {
        const dimmed = hoveredKey != null && hoveredKey !== item.key;
        return (
          <button
            key={item.key}
            onMouseEnter={() => onHover?.(item.key)}
            onMouseLeave={() => onHover?.(null)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-opacity ${
              dimmed ? "opacity-40" : "opacity-100"
            }`}
            style={{ color: item.color, backgroundColor: item.color + "15" }}
          >
            {item.marker === "line" ? (
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: item.color }} />
            ) : (
              <span
                className={`w-2 h-2 ${item.marker === "square" ? "rounded-sm" : "rounded-full"}`}
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
