import type { Point, Rect } from "./types";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ScreenCaptureBoxProps {
  rect: Rect;
  onStartMove: (start: Point) => void;
  onStartResize: (handle: Handle, start: Point) => void;
}

const HANDLES: { key: Handle; cursor: string; cx: number; cy: number }[] = [
  { key: "nw", cursor: "nwse-resize", cx: 0, cy: 0 },
  { key: "n", cursor: "ns-resize", cx: 0.5, cy: 0 },
  { key: "ne", cursor: "nesw-resize", cx: 1, cy: 0 },
  { key: "e", cursor: "ew-resize", cx: 1, cy: 0.5 },
  { key: "se", cursor: "nwse-resize", cx: 1, cy: 1 },
  { key: "s", cursor: "ns-resize", cx: 0.5, cy: 1 },
  { key: "sw", cursor: "nesw-resize", cx: 0, cy: 1 },
  { key: "w", cursor: "ew-resize", cx: 0, cy: 0.5 },
];

export default function ScreenCaptureBox({ rect, onStartMove, onStartResize }: ScreenCaptureBoxProps) {
  return (
    <g pointerEvents="all" className="screen-capture-box">
      {/* Dashed outline */}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="rgba(59, 130, 246, 0.05)"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="8 6"
        style={{ cursor: "move" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartMove({ x: e.clientX, y: e.clientY });
        }}
      />
      {/* Resize handles */}
      {HANDLES.map((h) => {
        const cx = rect.x + h.cx * rect.width;
        const cy = rect.y + h.cy * rect.height;
        return (
          <circle
            key={h.key}
            cx={cx}
            cy={cy}
            r={7}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            style={{ cursor: h.cursor }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartResize(h.key, { x: e.clientX, y: e.clientY });
            }}
          />
        );
      })}
    </g>
  );
}
