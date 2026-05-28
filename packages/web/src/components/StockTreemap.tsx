import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import type { HeatmapData } from "../lib/api";

interface TreemapNode {
  name: string;
  value: number;
  change: number;
  symbol: string;
  sector: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface SectorNode {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function colorForChange(pct: number): string {
  if (pct >= 5) return "#16a34a";
  if (pct >= 2) return "#22c55e";
  if (pct >= 0.5) return "#4ade80";
  if (pct >= 0) return "#86efac";
  if (pct >= -0.5) return "#fca5a5";
  if (pct >= -2) return "#f87171";
  if (pct >= -5) return "#ef4444";
  return "#dc2626";
}

function textColorForChange(pct: number): string {
  if (pct >= 0.5 || pct <= -0.5) return "#ffffff";
  return "#1f2937";
}

interface Props {
  data: HeatmapData;
}

export default function StockTreemap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: Math.max(rect.width, 200), height: Math.max(rect.height, 200) });
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { leaves, sectors } = useMemo(() => {
    if (!data.sectors.length) return { leaves: [] as TreemapNode[], sectors: [] as SectorNode[] };

    const rootData = {
      name: "root",
      children: data.sectors.map((sector) => ({
        name: sector.sector,
        children: sector.stocks.map((stock) => ({
          name: stock.symbol,
          value: Math.max(stock.market_cap, 1),
          change: stock.change_percent,
          symbol: stock.symbol,
          sector: sector.sector,
        })),
      })),
    };

    const root = hierarchy<any>(rootData)
      .sum((d) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemap()
      .tile(treemapSquarify)
      .size([size.width, size.height])
      .paddingTop(22)
      .paddingInner(2)
      .round(true)(root);

    const nodes: TreemapNode[] = [];
    const sectorNodes: SectorNode[] = [];

    root.children?.forEach((child: any) => {
      sectorNodes.push({
        name: child.data.name,
        x0: child.x0,
        y0: child.y0,
        x1: child.x1,
        y1: child.y1,
      });
    });

    root.leaves().forEach((leaf: any) => {
      nodes.push({
        name: leaf.data.name,
        value: leaf.data.value,
        change: leaf.data.change,
        symbol: leaf.data.symbol,
        sector: leaf.data.sector,
        x0: leaf.x0,
        x1: leaf.x1,
        y0: leaf.y0,
        y1: leaf.y1,
      });
    });

    return { leaves: nodes, sectors: sectorNodes };
  }, [data, size.width, size.height]);

  const isReady = leaves.length > 0 && size.width > 0 && size.height > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden"
      onMouseLeave={() => setHoveredSector(null)}
    >
      {!isReady && (
        <div className="flex items-center justify-center h-full text-xs text-gray-400">Loading…</div>
      )}
      {isReady && (
        <>
          {/* Sector frames with headers */}
          {sectors.map((sector) => {
            const w = sector.x1 - sector.x0;
            const h = sector.y1 - sector.y0;
            const isHovered = hoveredSector === sector.name;

            return (
              <div
                key={`frame-${sector.name}`}
                className="absolute pointer-events-none"
                style={{
                  left: sector.x0,
                  top: sector.y0,
                  width: w,
                  height: h,
                  border: isHovered ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                  borderRadius: 3,
                  zIndex: isHovered ? 5 : 1,
                  transition: "border-color 0.1s ease",
                }}
              >
                {/* Sector header */}
                <div
                  className="px-1.5 py-1 text-[10px] font-bold text-gray-500 truncate bg-white/90 flex items-center gap-0.5"
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  {sector.name}
                  <span className="text-gray-400 font-normal">&gt;</span>
                </div>
              </div>
            );
          })}

          {/* Sector hover overlays */}
          {sectors.map((sector) => {
            const w = sector.x1 - sector.x0;
            const h = sector.y1 - sector.y0;
            return (
              <div
                key={`overlay-${sector.name}`}
                className="absolute"
                style={{
                  left: sector.x0,
                  top: sector.y0,
                  width: w,
                  height: h,
                  zIndex: 4,
                  cursor: "default",
                }}
                onMouseEnter={() => setHoveredSector(sector.name)}
              />
            );
          })}

          {leaves.map((leaf) => {
            const w = leaf.x1 - leaf.x0;
            const h = leaf.y1 - leaf.y0;
            if (w < 16 || h < 16) return null;

            const bg = colorForChange(leaf.change);
            const fg = textColorForChange(leaf.change);
            const showName = w > 40 && h > 32;
            const showChange = w > 32 && h > 20;

            return (
              <Link
                key={leaf.symbol}
                to={`/ticker/${leaf.symbol}`}
                className="absolute flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                style={{
                  left: leaf.x0,
                  top: leaf.y0,
                  width: w,
                  height: h,
                  backgroundColor: bg,
                  borderRadius: 2,
                  zIndex: 10,
                }}
                title={`${leaf.symbol} — ${leaf.change >= 0 ? "+" : ""}${leaf.change.toFixed(2)}%`}
                onMouseEnter={() => setHoveredSector(leaf.sector)}
              >
                {showName && (
                  <span className="font-semibold leading-tight text-center px-1" style={{ color: fg, fontSize: Math.min(13, w / 5) }}>
                    {leaf.symbol}
                  </span>
                )}
                {showChange && (
                  <span className="font-medium leading-tight text-center px-1 mt-0.5" style={{ color: fg, fontSize: Math.min(10, w / 6) }}>
                    {leaf.change >= 0 ? "+" : ""}{leaf.change.toFixed(2)}%
                  </span>
                )}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
