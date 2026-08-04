import type { Point, Rect, Stroke } from "./types";

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointOnLineSegment(p: Point, a: Point, b: Point, threshold = 6): boolean {
  const len = distance(a, b);
  if (len === 0) return distance(p, a) <= threshold;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
  const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distance(p, projection) <= threshold;
}

export function projectPointOnLineSegment(p: Point, a: Point, b: Point): Point {
  const len = distance(a, b);
  if (len === 0) return { ...a };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

export function getStrokeControlPoints(stroke: Stroke): Point[] {
  switch (stroke.type) {
    case "pen":
      return [];
    case "line":
      return [stroke.start, stroke.end];
    case "polyline":
      return stroke.points;
    case "horizontal":
      return [{ x: window.innerWidth / 2, y: stroke.y }];
    default:
      return [];
  }
}

export function updateStrokeControlPoint(stroke: Stroke, index: number, point: Point): Stroke {
  switch (stroke.type) {
    case "line": {
      if (index === 0) return { ...stroke, start: point };
      if (index === 1) return { ...stroke, end: point };
      return stroke;
    }
    case "polyline": {
      const points = [...stroke.points];
      points[index] = point;
      return { ...stroke, points };
    }
    case "horizontal": {
      return { ...stroke, y: point.y };
    }
    default:
      return stroke;
  }
}

export function getCenteredCaptureRect(): Rect {
  const w = Math.max(320, Math.round(window.innerWidth * 0.5));
  const h = Math.max(240, Math.round(window.innerHeight * 0.4));
  return {
    x: Math.round((window.innerWidth - w) / 2),
    y: Math.round((window.innerHeight - h) / 2),
    width: w,
    height: h,
  };
}

export function clampRect(rect: Rect): Rect {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  let { x, y, width, height } = rect;
  width = Math.max(40, Math.min(width, maxW));
  height = Math.max(40, Math.min(height, maxH));
  x = Math.max(0, Math.min(x, maxW - width));
  y = Math.max(0, Math.min(y, maxH - height));
  return { x, y, width, height };
}

export function pathFromPoints(points: Point[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}
