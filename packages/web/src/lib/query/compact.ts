// Compact Grafana-style query DSL.
//
// Allows writing queries as short strings instead of full JSON:
//
//   price_history{symbol: $enabledTickers, range: $timeRange}
//   metric{symbol: AAPL, metric: pe_forward}
//   formula{symbol: AAPL, expression: "sma(20, close()) / sma(50, close())"}
//   fred{series_id: DGS10}
//
// Values can be:
//   - bare words / numbers (treated as strings)
//   - quoted strings
//   - variables: $var or ${var} or ${var:format}
//
// The string form is converted to a QuerySpec before execution.
// Object form is still accepted for full flexibility.

import type { QuerySpec, QueryInput } from "./types";

const COMPACT_QUERY_REGEX = /^(\w+)\s*\{/;

export function parseCompactQuery(input: string): QuerySpec {
  const trimmed = input.trim();
  const match = COMPACT_QUERY_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid compact query: "${trimmed}". Expected format: source{key: value, key: value}`
    );
  }

  const source = match[1];
  const bodyStart = match[0].length;
  const bodyEnd = findMatchingBrace(trimmed, bodyStart - 1);
  if (bodyEnd < 0) {
    throw new Error(`Unmatched '{' in compact query: "${trimmed}"`);
  }

  const body = trimmed.slice(bodyStart, bodyEnd);
  const params = parseParams(body);
  return { source, params };
}

function findMatchingBrace(s: string, openIdx: number): number {
  let depth = 1;
  let inQuote: string | null = null;
  let escaped = false;
  for (let i = openIdx + 1; i < s.length; i++) {
    const c = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      continue;
    }
    if (inQuote) {
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseParams(body: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  let i = 0;

  while (i < body.length) {
    i = skipWhitespace(body, i);
    if (i >= body.length) break;

    const keyEnd = readKey(body, i);
    const key = body.slice(i, keyEnd);
    if (!key) {
      throw new Error(`Expected parameter key at position ${i}`);
    }
    i = keyEnd;

    i = skipWhitespace(body, i);
    if (body[i] !== ":") {
      throw new Error(`Expected ':' after parameter key "${key}"`);
    }
    i++;

    i = skipWhitespace(body, i);
    const { value, nextIndex } = readValue(body, i);
    params[key] = value;
    i = nextIndex;

    i = skipWhitespace(body, i);
    if (body[i] === ",") {
      i++;
    }
  }

  return params;
}

function skipWhitespace(s: string, i: number): number {
  while (i < s.length && (s[i] === " " || s[i] === "\t" || s[i] === "\n" || s[i] === "\r")) {
    i++;
  }
  return i;
}

function readKey(s: string, i: number): number {
  let j = i;
  while (j < s.length && /[\w_]/.test(s[j])) {
    j++;
  }
  return j;
}

function readValue(s: string, i: number): { value: unknown; nextIndex: number } {
  if (i >= s.length) {
    throw new Error("Expected value after ':'");
  }

  const c = s[i];
  if (c === '"' || c === "'") {
    return readQuotedString(s, i, c);
  }

  // Read until top-level comma or closing brace.
  let depth = 0;
  let j = i;
  while (j < s.length) {
    const ch = s[j];
    if (ch === "(") {
      depth++;
      j++;
      continue;
    }
    if (ch === ")") {
      depth--;
      j++;
      continue;
    }
    if (ch === "," && depth === 0) break;
    if (ch === "}" && depth === 0) break;
    j++;
  }

  const raw = s.slice(i, j).trim();
  return { value: coerceValue(raw), nextIndex: j };
}

function readQuotedString(s: string, i: number, quote: string): { value: string; nextIndex: number } {
  let j = i + 1;
  let escaped = false;
  let value = "";
  while (j < s.length) {
    const c = s[j];
    if (escaped) {
      value += c;
      escaped = false;
      j++;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      j++;
      continue;
    }
    if (c === quote) {
      j++;
      return { value, nextIndex: j };
    }
    value += c;
    j++;
  }
  throw new Error(`Unterminated string starting at position ${i}`);
}

function coerceValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

export function isCompactQuery(value: unknown): value is string {
  return typeof value === "string" && COMPACT_QUERY_REGEX.test(value.trim());
}

/**
 * Normalize any supported query input into a canonical QuerySpec.
 *
 * Supported forms:
 *   - Compact string: "price_history{symbol: AAPL, range: 6mo}"
 *   - Full object: { source: "price_history", params: { symbol: "AAPL", range: "6mo" } }
 *   - Expression shorthand: { expr: "price - sma20", queries: { price: "price_history{...}", sma20: "formula{...}" } }
 */
export function normalizeQuery(input: QueryInput): QuerySpec {
  if (typeof input === "string") {
    return parseCompactQuery(input);
  }

  if (input && typeof input === "object" && "expr" in input) {
    const shorthand = input as import("./types").ExpressionQueryInput;
    const queries: Record<string, unknown> = {};
    if (shorthand.queries) {
      for (const [name, q] of Object.entries(shorthand.queries)) {
        queries[name] = typeof q === "string" ? q : normalizeQuery(q);
      }
    }
    return {
      source: "expression",
      params: {
        expression: shorthand.expr,
        queries,
      },
    };
  }

  return input as QuerySpec;
}
