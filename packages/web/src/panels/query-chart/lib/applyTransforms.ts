import type { QueryResponse, DataFrame, Column } from "../../../lib/query/types";

export type TransformStep =
  | { type: "rename"; mapping: Record<string, string> }
  | { type: "drop"; columns: string[] }
  | { type: "filter"; column: string; op: "eq" | "ne" | "gt" | "lt" | "gte" | "lte"; value: string | number }
  | { type: "sort"; column: string; direction?: "asc" | "desc" }
  | { type: "compute"; column: string; expression: string };

function getCell(row: unknown[], colIdx: number): unknown {
  return row[colIdx];
}

function getColumnIndex(df: DataFrame, name: string): number {
  return df.columns.findIndex((c) => c.name === name);
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function evaluateComputeExpression(expression: string, row: unknown[], colIndex: Map<string, number>): number | null {
  // Supports simple binary expressions: col op col, col op number, number op col
  // Operators: + - * /
  const match = expression.match(/^\s*(.+?)\s*([+\-*/])\s*(.+?)\s*$/);
  if (!match) return null;

  const [, leftRaw, op, rightRaw] = match;

  const parseValue = (raw: string): number | null => {
    const trimmed = raw.trim();
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    const idx = colIndex.get(trimmed);
    if (idx === undefined) return null;
    const v = row[idx];
    if (typeof v === "number") return v;
    const parsed = Number(v);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const left = parseValue(leftRaw);
  const right = parseValue(rightRaw);
  if (left === null || right === null) return null;

  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? null : left / right;
    default:
      return null;
  }
}

function applyTransform(df: DataFrame, step: TransformStep): DataFrame {
  switch (step.type) {
    case "rename": {
      const mapping = step.mapping;
      return {
        columns: df.columns.map((c) => ({ ...c, name: mapping[c.name] ?? c.name })),
        rows: df.rows,
      };
    }

    case "drop": {
      const dropSet = new Set(step.columns);
      const keepIndices = df.columns
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !dropSet.has(c.name))
        .map(({ i }) => i);
      return {
        columns: keepIndices.map((i) => df.columns[i]),
        rows: df.rows.map((row) => keepIndices.map((i) => row[i])),
      };
    }

    case "filter": {
      const colIdx = getColumnIndex(df, step.column);
      if (colIdx < 0) return df;
      return {
        columns: df.columns,
        rows: df.rows.filter((row) => {
          const value = getCell(row, colIdx);
          const cmp = compareValues(value, step.value);
          switch (step.op) {
            case "eq":
              return cmp === 0;
            case "ne":
              return cmp !== 0;
            case "gt":
              return cmp > 0;
            case "gte":
              return cmp >= 0;
            case "lt":
              return cmp < 0;
            case "lte":
              return cmp <= 0;
            default:
              return true;
          }
        }),
      };
    }

    case "sort": {
      const colIdx = getColumnIndex(df, step.column);
      if (colIdx < 0) return df;
      const direction = step.direction ?? "asc";
      return {
        columns: df.columns,
        rows: [...df.rows].sort((a, b) => {
          const cmp = compareValues(getCell(a, colIdx), getCell(b, colIdx));
          return direction === "desc" ? -cmp : cmp;
        }),
      };
    }

    case "compute": {
      const colIndex = new Map(df.columns.map((c, i) => [c.name, i]));
      const newColumn: Column = { name: step.column, type: "number" };
      return {
        columns: [...df.columns, newColumn],
        rows: df.rows.map((row) => {
          const value = evaluateComputeExpression(step.expression, row, colIndex);
          return [...row, value];
        }),
      };
    }

    default:
      return df;
  }
}

export function applyTransforms(response: QueryResponse, transforms: TransformStep[] | undefined): QueryResponse {
  if (!transforms || transforms.length === 0) return response;

  let df: DataFrame = { columns: response.columns, rows: response.rows };
  for (const step of transforms) {
    df = applyTransform(df, step);
  }

  return {
    ...response,
    columns: df.columns,
    rows: df.rows,
    row_count: df.rows.length,
  };
}
