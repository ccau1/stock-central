import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import type { Point, Rect, Stroke, Tool, DragState, CaptureDragState, PenStroke, LineStroke, HorizontalStroke } from "./types";
import {
  generateId,
  distance,
  projectPointOnLineSegment,
  getStrokeControlPoints,
  updateStrokeControlPoint,
  getCenteredCaptureRect,
  clampRect,
  pathFromPoints,
} from "./utils";
import ToolPalette from "./ToolPalette";
import EditToolbox from "./EditToolbox";
import ScreenCaptureBox from "./ScreenCaptureBox";
import ScreenCaptureToolbox from "./ScreenCaptureToolbox";

interface DrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DrawingCanvas({ isOpen, onClose }: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [penDraft, setPenDraft] = useState<Point[] | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);

  const [captureRect, setCaptureRect] = useState<Rect | null>(null);
  const [captureDrag, setCaptureDrag] = useState<CaptureDragState | null>(null);
  const [copied, setCopied] = useState(false);

  const finishPolyline = useCallback(() => {
    if (draftPoints.length >= 2) {
      const stroke: Stroke = {
        id: generateId(),
        type: "polyline",
        color,
        width: strokeWidth,
        points: draftPoints,
        closed: false,
      };
      setStrokes((prev) => [...prev, stroke]);
    }
    setDraftPoints([]);
  }, [draftPoints, color, strokeWidth]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setStrokes((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Keyboard delete + Escape handling
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !draftPoints.length && !penDraft) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        if (penDraft) {
          setPenDraft(null);
        } else if (draftPoints.length) {
          if (activeTool === "polyline") {
            finishPolyline();
          } else {
            setDraftPoints([]);
          }
        } else if (selectedId) {
          setSelectedId(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, selectedId, draftPoints.length, penDraft, activeTool, deleteSelected, onClose, finishPolyline]);

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
    setSelectedId(null);
    setDraftPoints([]);
    setPenDraft(null);
    if (tool === "screencap") {
      setCaptureRect(getCenteredCaptureRect());
    } else {
      setCaptureRect(null);
    }
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;

    // When a line is selected, clicking empty canvas switches to pointer mode:
    // deselect the line instead of starting a new drawing action.
    if (selectedId) {
      setSelectedId(null);
      return;
    }

    const point = { x: e.clientX, y: e.clientY };

    // Screencap mode: clicking empty area does not start drawing.
    if (activeTool === "screencap") {
      return;
    }

    // Pen: start freehand stroke
    if (activeTool === "pen") {
      setPenDraft([point]);
      return;
    }

    // Horizontal: single-click creates the line
    if (activeTool === "horizontal") {
      const stroke: HorizontalStroke = {
        id: generateId(),
        type: "horizontal",
        color,
        width: strokeWidth,
        y: point.y,
      };
      setStrokes((prev) => [...prev, stroke]);
      setSelectedId(stroke.id);
      return;
    }

    // Line: first click sets start, second click creates line
    if (activeTool === "line") {
      if (draftPoints.length === 0) {
        setDraftPoints([point]);
        setSelectedId(null);
      } else {
        const stroke: LineStroke = {
          id: generateId(),
          type: "line",
          color,
          width: strokeWidth,
          start: draftPoints[0],
          end: point,
        };
        setStrokes((prev) => [...prev, stroke]);
        setSelectedId(stroke.id);
        setDraftPoints([]);
      }
      return;
    }

    // Polyline: add points; clicking first point closes, otherwise append
    if (activeTool === "polyline") {
      if (draftPoints.length === 0) {
        setDraftPoints([point]);
        setSelectedId(null);
      } else {
        const first = draftPoints[0];
        if (draftPoints.length >= 3 && distance(point, first) < 12) {
          // Close polyline
          const stroke: Stroke = {
            id: generateId(),
            type: "polyline",
            color,
            width: strokeWidth,
            points: draftPoints,
            closed: true,
          };
          setStrokes((prev) => [...prev, stroke]);
          setSelectedId(stroke.id);
          setDraftPoints([]);
        } else {
          setDraftPoints((prev) => [...prev, point]);
        }
      }
      return;
    }

    // Default: deselect when clicking empty canvas
    setSelectedId(null);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = { x: e.clientX, y: e.clientY };
    setCursor(point);

    if (penDraft) {
      const last = penDraft[penDraft.length - 1];
      if (distance(last, point) > 2) {
        setPenDraft((prev) => (prev ? [...prev, point] : prev));
      }
      return;
    }

    if (dragState) {
      setStrokes((prev) =>
        prev.map((s) => (s.id === dragState.strokeId ? updateStrokeControlPoint(s, dragState.pointIndex, point) : s))
      );
      return;
    }

    if (captureDrag && captureRect) {
      const dx = point.x - captureDrag.startX;
      const dy = point.y - captureDrag.startY;
      let next = { ...captureRect };
      if (captureDrag.kind === "move") {
        next.x = captureDrag.startRect.x + dx;
        next.y = captureDrag.startRect.y + dy;
      } else if (captureDrag.handle) {
        const r = { ...captureDrag.startRect };
        switch (captureDrag.handle) {
          case "e":
            next = { ...r, width: Math.max(40, r.width + dx) };
            break;
          case "w":
            next = {
              x: r.x + Math.min(dx, r.width - 40),
              y: r.y,
              width: Math.max(40, r.width - dx),
              height: r.height,
            };
            break;
          case "s":
            next = { ...r, height: Math.max(40, r.height + dy) };
            break;
          case "n":
            next = {
              x: r.x,
              y: r.y + Math.min(dy, r.height - 40),
              width: r.width,
              height: Math.max(40, r.height - dy),
            };
            break;
          case "se":
            next = { ...r, width: Math.max(40, r.width + dx), height: Math.max(40, r.height + dy) };
            break;
          case "sw":
            next = {
              x: r.x + Math.min(dx, r.width - 40),
              y: r.y,
              width: Math.max(40, r.width - dx),
              height: Math.max(40, r.height + dy),
            };
            break;
          case "ne":
            next = {
              x: r.x,
              y: r.y + Math.min(dy, r.height - 40),
              width: Math.max(40, r.width + dx),
              height: Math.max(40, r.height - dy),
            };
            break;
          case "nw":
            next = {
              x: r.x + Math.min(dx, r.width - 40),
              y: r.y + Math.min(dy, r.height - 40),
              width: Math.max(40, r.width - dx),
              height: Math.max(40, r.height - dy),
            };
            break;
        }
      }
      setCaptureRect(clampRect(next));
      return;
    }
  };

  const handleSvgPointerUp = () => {
    if (penDraft) {
      if (penDraft.length > 1) {
        const stroke: PenStroke = {
          id: generateId(),
          type: "pen",
          color,
          width: strokeWidth,
          points: penDraft,
        };
        setStrokes((prev) => [...prev, stroke]);
        setSelectedId(stroke.id);
      }
      setPenDraft(null);
    }
    setDragState(null);
    setCaptureDrag(null);
  };

  const handleStrokePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (activeTool !== "screencap") {
      setSelectedId(id);
    }
  };

  const handleControlPointPointerDown = (e: React.PointerEvent, strokeId: string, pointIndex: number) => {
    e.stopPropagation();
    setSelectedId(strokeId);
    setDragState({ strokeId, pointIndex });
  };

  const handlePolylineSegmentPointerDown = (
    e: React.PointerEvent,
    strokeId: string,
    segmentIndex: number,
    a: Point,
    b: Point
  ) => {
    e.stopPropagation();
    const click = { x: e.clientX, y: e.clientY };
    const projected = projectPointOnLineSegment(click, a, b);
    if (distance(click, projected) < 12) {
      setStrokes((prev) =>
        prev.map((s) => {
          if (s.id !== strokeId || s.type !== "polyline") return s;
          const points = [...s.points];
          points.splice(segmentIndex + 1, 0, projected);
          return { ...s, points };
        })
      );
      setSelectedId(strokeId);
      setDragState({ strokeId, pointIndex: segmentIndex + 1 });
    }
  };

  const startCaptureMove = (point: Point) => {
    if (!captureRect) return;
    setCaptureDrag({ kind: "move", startX: point.x, startY: point.y, startRect: captureRect });
  };

  const startCaptureResize = (handle: CaptureDragState["handle"], point: Point) => {
    if (!captureRect || !handle) return;
    setCaptureDrag({ kind: "resize", handle, startX: point.x, startY: point.y, startRect: captureRect });
  };

  const handleCapture = async (action: "download" | "copy") => {
    if (!captureRect || !overlayRef.current) return;

    const overlay = overlayRef.current;
    const uiSelectors = ".tool-palette, .edit-toolbox, .screen-capture-toolbox, .screen-capture-box, .control-points";
    const uiElements = Array.from(overlay.querySelectorAll(uiSelectors)) as HTMLElement[];
    const originalDisplays = uiElements.map((el) => el.style.display);

    try {
      uiElements.forEach((el) => {
        el.style.display = "none";
      });
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: window.devicePixelRatio || 1,
        logging: false,
      });
      uiElements.forEach((el, i) => {
        el.style.display = originalDisplays[i];
      });

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(captureRect.width * (window.devicePixelRatio || 1));
      cropCanvas.height = Math.round(captureRect.height * (window.devicePixelRatio || 1));
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(
        canvas,
        Math.round(captureRect.x * (window.devicePixelRatio || 1)),
        Math.round(captureRect.y * (window.devicePixelRatio || 1)),
        cropCanvas.width,
        cropCanvas.height,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      const blob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      if (action === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screenshot-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        if (navigator.clipboard && (window as typeof window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            alert("Copy not supported on this browser — use Download instead.");
          }
        } else {
          alert("Copy not supported on this browser — use Download instead.");
        }
      }
    } catch (err) {
      uiElements.forEach((el, i) => {
        el.style.display = originalDisplays[i];
      });
      console.error("Screen capture failed:", err);
      alert("Screen capture failed.");
    }
  };

  // Render helpers
  const renderStrokes = () => {
    return strokes.map((stroke) => {
      const isSelected = selectedId === stroke.id;
      const commonProps = {
        stroke: stroke.color,
        strokeWidth: stroke.width,
        fill: "none",
        style: { pointerEvents: (isSelected ? "none" : "all") as "none" | "all" },
        onPointerDown: isSelected ? undefined : (e: React.PointerEvent) => handleStrokePointerDown(e, stroke.id),
      };

      switch (stroke.type) {
        case "pen":
          return (
            <path
              key={stroke.id}
              d={pathFromPoints(stroke.points)}
              {...commonProps}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isSelected ? 0.8 : 1}
            />
          );
        case "line":
          return (
            <line
              key={stroke.id}
              x1={stroke.start.x}
              y1={stroke.start.y}
              x2={stroke.end.x}
              y2={stroke.end.y}
              {...commonProps}
            />
          );
        case "polyline": {
          const d = pathFromPoints(stroke.points) + (stroke.closed ? " Z" : "");
          return (
            <g key={stroke.id}>
              <path
                d={d}
                {...commonProps}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={stroke.closed ? `${stroke.color}33` : "none"}
              />
              {isSelected &&
                stroke.points.map((p, i) => {
                  const next = stroke.points[i + 1] || (stroke.closed ? stroke.points[0] : null);
                  if (!next) return null;
                  return (
                    <line
                      key={`seg-${i}`}
                      x1={p.x}
                      y1={p.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ cursor: "pointer", pointerEvents: "all" }}
                      onPointerDown={(e) => handlePolylineSegmentPointerDown(e, stroke.id, i, p, next)}
                    />
                  );
                })}
            </g>
          );
        }
        case "horizontal":
          return (
            <line
              key={stroke.id}
              x1={0}
              y1={stroke.y}
              x2={window.innerWidth}
              y2={stroke.y}
              {...commonProps}
            />
          );
        default:
          return null;
      }
    });
  };

  const renderControlPoints = () => {
    if (!selectedId) return null;
    const stroke = strokes.find((s) => s.id === selectedId);
    if (!stroke) return null;
    const points = getStrokeControlPoints(stroke);
    if (points.length === 0) return null;

    return (
      <g pointerEvents="all" className="control-points">
        {points.map((p, i) => (
          <circle
            key={`${stroke.id}-cp-${i}`}
            cx={p.x}
            cy={p.y}
            r={7}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2}
            style={{ cursor: "move" }}
            onPointerDown={(e) => handleControlPointPointerDown(e, stroke.id, i)}
          />
        ))}
      </g>
    );
  };

  const renderDrafts = () => {
    if (!cursor) return null;
    const elements: React.ReactNode[] = [];

    if (penDraft && penDraft.length > 0) {
      elements.push(
        <path
          key="pen-draft"
          d={pathFromPoints(penDraft)}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      );
    }

    if (activeTool === "line" && draftPoints.length === 1) {
      elements.push(
        <line
          key="line-draft"
          x1={draftPoints[0].x}
          y1={draftPoints[0].y}
          x2={cursor.x}
          y2={cursor.y}
          stroke={color}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      );
    }

    if (activeTool === "polyline" && draftPoints.length > 0) {
      const d = pathFromPoints(draftPoints);
      elements.push(
        <path
          key="polyline-draft"
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      );
      const last = draftPoints[draftPoints.length - 1];
      elements.push(
        <line
          key="polyline-preview"
          x1={last.x}
          y1={last.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      );
      if (draftPoints.length >= 3) {
        const first = draftPoints[0];
        elements.push(
          <circle
            key="polyline-close"
            cx={first.x}
            cy={first.y}
            r={6}
            fill={color}
            opacity={distance(cursor, first) < 12 ? 0.8 : 0.4}
            pointerEvents="none"
          />
        );
      }
    }

    return elements;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70]"
      style={{ touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        onDoubleClick={() => {
          if (activeTool === "polyline" && draftPoints.length >= 2) {
            finishPolyline();
          }
        }}
      >
        {renderStrokes()}
        {renderControlPoints()}
        {renderDrafts()}
        {activeTool === "screencap" && captureRect && (
          <ScreenCaptureBox
            rect={captureRect}
            onStartMove={startCaptureMove}
            onStartResize={startCaptureResize}
          />
        )}
      </svg>

      <ToolPalette
        activeTool={activeTool}
        color={color}
        width={strokeWidth}
        isPolylineDrafting={draftPoints.length > 0 && activeTool === "polyline"}
        onSelectTool={handleToolChange}
        onSetColor={setColor}
        onSetWidth={setStrokeWidth}
        onFinishPolyline={finishPolyline}
        onClose={onClose}
      />

      {selectedId && activeTool !== "screencap" && <EditToolbox onDelete={deleteSelected} />}

      {activeTool === "screencap" && captureRect && (
        <ScreenCaptureToolbox
          copied={copied}
          onDownload={() => handleCapture("download")}
          onCopy={() => handleCapture("copy")}
        />
      )}
    </div>,
    document.body
  );
}
