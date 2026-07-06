import type { DashboardVariable } from "../../lib/api";

// Grafana-style variable substitution for panel queries.
//
// Users reference dashboard variables with `$var` or `${var}` syntax.
// Multi-value variables (e.g. tickers) can be formatted:
//   $tickers or ${tickers}       → default CSV
//   ${tickers:csv}               → AAPL,MSFT,GOOGL
//   ${tickers:json}              → ["AAPL","MSFT","GOOGL"]
//   ${tickers:pipe}              → AAPL|MSFT|GOOGL
//   ${tickers:space}             → AAPL MSFT GOOGL
//   ${tickers:query}             → symbol IN ('AAPL','MSFT','GOOGL')
//
// Scalar variables (e.g. $timeRange) ignore format specifiers.

export interface VariableContext {
  [name: string]: string | string[] | undefined;
}

export type VariableFormat = "csv" | "json" | "pipe" | "space" | "query" | "raw";

const VARIABLE_REGEX = /\$\{(?:(\w+)(?::(\w+))?)\}|\$(\w+)/g;

export function resolveVariables(input: unknown, ctx: VariableContext): unknown {
  const json = JSON.stringify(input);
  const resolved = json.replace(VARIABLE_REGEX, (_, bracedName, bracedFormat, bareName) => {
    const name = bracedName || bareName;
    const format = (bracedFormat || "csv") as VariableFormat;
    return formatVariableValue(ctx[name], format);
  });
  try {
    return JSON.parse(resolved);
  } catch (err) {
    throw new Error(`Variable substitution produced invalid JSON: ${resolved}. ${err}`);
  }
}

function formatVariableValue(value: string | string[] | undefined, format: VariableFormat): string {
  if (value === undefined) return "";

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  // value is string[]
  switch (format) {
    case "json":
    case "raw":
      return JSON.stringify(value);
    case "pipe":
      return JSON.stringify(value.join("|"));
    case "space":
      return JSON.stringify(value.join(" "));
    case "query":
      return JSON.stringify(value.map((s) => `symbol IN ('${s}')`).join(" OR "));
    case "csv":
    default:
      return JSON.stringify(value.join(","));
  }
}

export function buildVariableContext(
  tickers?: string[],
  enabledTickers?: string[],
  timeRange?: string,
  country?: string,
  dashboardVariables?: DashboardVariable[],
  panelVariables?: Record<string, string | string[]>
): VariableContext {
  const ctx: VariableContext = {
    tickers,
    enabledTickers,
    timeRange,
    country,
  };

  if (dashboardVariables) {
    for (const v of dashboardVariables) {
      ctx[v.name] = resolveDashboardVariableValue(v);
    }
  }

  if (panelVariables) {
    for (const [name, value] of Object.entries(panelVariables)) {
      ctx[name] = value;
    }
  }

  return ctx;
}

function resolveDashboardVariableValue(v: DashboardVariable): string | string[] {
  const raw = v.default ?? v.options?.[0] ?? "";
  if (v.multi && typeof raw === "string" && raw.includes(",")) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return raw;
}

export const BUILTIN_VARIABLES = [
  { name: "tickers", description: "All tickers on the dashboard", example: "${tickers:csv}" },
  { name: "enabledTickers", description: "Tickers currently enabled in the panel", example: "${enabledTickers:csv}" },
  { name: "timeRange", description: "Selected time range", example: "$timeRange" },
  { name: "country", description: "Selected country filter", example: "$country" },
];

export function listDashboardVariableNames(vars?: DashboardVariable[]): string[] {
  return vars?.map((v) => v.name) ?? [];
}
