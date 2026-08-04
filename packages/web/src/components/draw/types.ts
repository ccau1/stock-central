export type Tool = "pen" | "line" | "polyline" | "horizontal" | "screencap";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseStroke {
  id: string;
  color: string;
  width: number;
}

export interface PenStroke extends BaseStroke {
  type: "pen";
  points: Point[];
}

export interface LineStroke extends BaseStroke {
  type: "line";
  start: Point;
  end: Point;
}

export interface PolylineStroke extends BaseStroke {
  type: "polyline";
  points: Point[];
  closed: boolean;
}

export interface HorizontalStroke extends BaseStroke {
  type: "horizontal";
  y: number;
}

export type Stroke = PenStroke | LineStroke | PolylineStroke | HorizontalStroke;

export interface DragState {
  strokeId: string;
  pointIndex: number;
}

export interface CaptureDragState {
  kind: "move" | "resize";
  handle?: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
  startX: number;
  startY: number;
  startRect: Rect;
}
