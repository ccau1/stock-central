import { useState } from "react";

interface NodeDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  color: string;
  textColor?: string;
}

interface EdgeDef {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  fromSide?: "top" | "bottom" | "left" | "right";
  toSide?: "top" | "bottom" | "left" | "right";
}

interface DiagramData {
  nodes: NodeDef[];
  edges: EdgeDef[];
}

const accumulationData: DiagramData = {
  nodes: [
    {
      id: "income",
      x: 350,
      y: 20,
      width: 200,
      height: 56,
      label: "Job Income",
      sublabel: "after-tax paycheck",
      color: "#2563eb",
      textColor: "#ffffff",
    },
    {
      id: "expenses",
      x: 80,
      y: 160,
      width: 160,
      height: 56,
      label: "Expenses",
      sublabel: "~50-80% of income",
      color: "#f59e0b",
      textColor: "#ffffff",
    },
    {
      id: "investments",
      x: 580,
      y: 160,
      width: 180,
      height: 56,
      label: "Investments",
      sublabel: "remaining surplus",
      color: "#10b981",
      textColor: "#ffffff",
    },
    // Expense breakdown
    { id: "housing", x: 20, y: 320, width: 110, height: 44, label: "Housing", sublabel: "25-35%", color: "#fef3c7", textColor: "#92400e" },
    { id: "utilities", x: 150, y: 320, width: 110, height: 44, label: "Utilities", sublabel: "5-10%", color: "#fef3c7", textColor: "#92400e" },
    { id: "transport", x: 20, y: 390, width: 110, height: 44, label: "Transport", sublabel: "10-15%", color: "#fef3c7", textColor: "#92400e" },
    { id: "food", x: 150, y: 390, width: 110, height: 44, label: "Food", sublabel: "10-15%", color: "#fef3c7", textColor: "#92400e" },
    { id: "entertainment", x: 85, y: 460, width: 110, height: 44, label: "Entertainment", sublabel: "5-10%", color: "#fef3c7", textColor: "#92400e" },
    // Investment breakdown
    { id: "bonds", x: 450, y: 320, width: 90, height: 44, label: "Bonds", sublabel: "stability & income", color: "#d1fae5", textColor: "#065f46" },
    { id: "re", x: 570, y: 320, width: 90, height: 44, label: "Real Estate", sublabel: "high leverage", color: "#d1fae5", textColor: "#065f46" },
    { id: "stocks", x: 690, y: 320, width: 90, height: 44, label: "Stocks", sublabel: "core growth", color: "#d1fae5", textColor: "#065f46" },
    { id: "commodities", x: 810, y: 320, width: 90, height: 44, label: "Commodities", sublabel: "diversifier", color: "#d1fae5", textColor: "#065f46" },
    // Stock breakdown
    { id: "etf", x: 480, y: 460, width: 90, height: 44, label: "ETFs", sublabel: "40%", color: "#dbeafe", textColor: "#1e40af" },
    { id: "bluechips", x: 590, y: 460, width: 90, height: 44, label: "Blue Chips", sublabel: "30%", color: "#dbeafe", textColor: "#1e40af" },
    { id: "growth", x: 700, y: 460, width: 90, height: 44, label: "Growth", sublabel: "20%", color: "#dbeafe", textColor: "#1e40af" },
    { id: "risky", x: 810, y: 460, width: 90, height: 44, label: "Risky", sublabel: "10%", color: "#dbeafe", textColor: "#1e40af" },
  ],
  edges: [
    { from: "income", to: "expenses", label: "spend" },
    { from: "income", to: "investments", label: "invest" },
    { from: "expenses", to: "housing" },
    { from: "expenses", to: "utilities" },
    { from: "expenses", to: "transport" },
    { from: "expenses", to: "food" },
    { from: "expenses", to: "entertainment" },
    { from: "investments", to: "bonds" },
    { from: "investments", to: "re" },
    { from: "investments", to: "stocks" },
    { from: "investments", to: "commodities" },
    { from: "stocks", to: "etf" },
    { from: "stocks", to: "bluechips" },
    { from: "stocks", to: "growth" },
    { from: "stocks", to: "risky" },
  ],
};

const withdrawalData: DiagramData = {
  nodes: [
    {
      id: "engine",
      x: 240,
      y: 120,
      width: 220,
      height: 80,
      label: "Investment Engine",
      sublabel: "grown portfolio over years",
      color: "#10b981",
      textColor: "#ffffff",
    },
    {
      id: "withdrawal",
      x: 620,
      y: 130,
      width: 180,
      height: 60,
      label: "Safe Withdrawal",
      sublabel: "e.g. 4% per year",
      color: "#3b82f6",
      textColor: "#ffffff",
    },
    {
      id: "expenses",
      x: 620,
      y: 360,
      width: 180,
      height: 60,
      label: "Living Expenses",
      sublabel: "covered without a job",
      color: "#f59e0b",
      textColor: "#ffffff",
    },
    {
      id: "growth",
      x: 260,
      y: 360,
      width: 180,
      height: 60,
      label: "Continued Growth",
      sublabel: "remaining assets keep compounding",
      color: "#8b5cf6",
      textColor: "#ffffff",
    },
  ],
  edges: [
    { from: "engine", to: "withdrawal", label: "draw", fromSide: "right", toSide: "left" },
    { from: "withdrawal", to: "expenses", label: "covers" },
    { from: "engine", to: "growth", label: "stays invested", dashed: true },
  ],
};

function getConnectionPoint(
  node: NodeDef,
  side: "top" | "bottom" | "left" | "right"
) {
  switch (side) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height / 2 };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
  }
}

function renderEdge(
  from: NodeDef,
  to: NodeDef,
  label?: string,
  dashed?: boolean,
  fromSide?: "top" | "bottom" | "left" | "right",
  toSide?: "top" | "bottom" | "left" | "right"
) {
  const fromSideActual = fromSide ?? "bottom";
  const toSideActual = toSide ?? "top";
  const start = getConnectionPoint(from, fromSideActual);
  const end = getConnectionPoint(to, toSideActual);

  // Use bezier curve with control points oriented to the connection sides
  const isHorizontal = fromSideActual === "left" || fromSideActual === "right";
  let d: string;
  if (isHorizontal) {
    const midX = (start.x + end.x) / 2;
    d = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
  } else {
    const midY = (start.y + end.y) / 2;
    d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  }

  const midPointX = (start.x + end.x) / 2;
  const midPointY = (start.y + end.y) / 2;
  const labelWidth = label ? Math.max(44, label.length * 6 + 16) : 44;

  return (
    <g key={`${from.id}-${to.id}`}>
      <path
        d={d}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={2}
        strokeDasharray={dashed ? "6 4" : undefined}
        markerEnd="url(#arrowhead)"
      />
      {label && (
        <g>
          <rect
            x={midPointX - labelWidth / 2}
            y={midPointY - 10}
            width={labelWidth}
            height={20}
            rx={10}
            fill="#ffffff"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text
            x={midPointX}
            y={midPointY + 4}
            textAnchor="middle"
            className="text-[9px] fill-gray-600"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function renderNode(node: NodeDef) {
  return (
    <g key={node.id}>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={8}
        fill={node.color}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
      />
      <text
        x={node.x + node.width / 2}
        y={node.y + node.height / 2 - (node.sublabel ? 5 : 0)}
        textAnchor="middle"
        className="text-[11px] font-semibold"
        fill={node.textColor ?? "#1f2937"}
      >
        {node.label}
      </text>
      {node.sublabel && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2 + 12}
          textAnchor="middle"
          className="text-[9px]"
          fill={node.textColor ?? "#4b5563"}
          opacity={0.9}
        >
          {node.sublabel}
        </text>
      )}
    </g>
  );
}

export default function IncomeFunnelDiagram() {
  const [phase, setPhase] = useState<"accumulation" | "withdrawal">(
    "accumulation"
  );

  const data = phase === "accumulation" ? accumulationData : withdrawalData;
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  return (
    <div className="my-6 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {phase === "accumulation"
            ? "Accumulation Phase"
            : "Withdrawal Phase"}
        </h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setPhase("accumulation")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              phase === "accumulation"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Income Funnel
          </button>
          <button
            type="button"
            onClick={() => setPhase("withdrawal")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              phase === "withdrawal"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Withdrawal Engine
          </button>
        </div>
      </div>

      <svg
        viewBox="0 0 900 560"
        className="w-full min-w-[700px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
          </marker>
        </defs>

        {phase === "accumulation" && (
          <text
            x={450}
            y={540}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            Surplus income is routed into investments, which compound over time.
          </text>
        )}

        {phase === "withdrawal" && (
          <text
            x={450}
            y={540}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            A grown portfolio can generate withdrawals that replace job income.
          </text>
        )}

        {data.edges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return renderEdge(
            from,
            to,
            edge.label,
            edge.dashed,
            edge.fromSide,
            edge.toSide
          );
        })}

        {data.nodes.map(renderNode)}
      </svg>

      <p className="mt-3 text-xs text-gray-500">
        {phase === "accumulation"
          ? "During working years, your paycheck is split between living expenses and investments. The investment portion is diversified across asset classes and stock styles."
          : "Once the portfolio is large enough, a disciplined withdrawal rate (commonly 3–4% annually) can cover expenses while the remaining assets continue to grow."}
      </p>
    </div>
  );
}
