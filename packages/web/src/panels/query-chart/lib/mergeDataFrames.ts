import type { QueryResponse, Column } from "../../../lib/query/types";

export interface NamedQueryResponse {
  name?: string;
  response: QueryResponse;
}

export interface MergeDataFramesOptions {
  key?: string;
}

export function mergeQueryResponses(inputs: NamedQueryResponse[], options: MergeDataFramesOptions = {}): QueryResponse {
  if (inputs.length === 0) {
    return { source: "merge", row_count: 0, columns: [], rows: [] };
  }

  // Surface any sub-query error immediately.
  const firstError = inputs.find((i) => i.response.error);
  if (firstError) {
    return {
      source: "merge",
      row_count: 0,
      columns: [],
      rows: [],
      error: firstError.response.error,
    };
  }

  if (inputs.length === 1) {
    return inputs[0].response;
  }

  const keyColumn = options.key ?? "date";
  const keySet = new Set<string | number>();
  const keyOrder: (string | number)[] = [];

  for (const { response } of inputs) {
    const keyIdx = response.columns.findIndex((c) => c.name === keyColumn);
    if (keyIdx < 0) continue;
    for (const row of response.rows) {
      const key = row[keyIdx];
      if (key == null) continue;
      const keyValue = typeof key === "number" ? key : String(key);
      if (!keySet.has(keyValue)) {
        keySet.add(keyValue);
        keyOrder.push(keyValue);
      }
    }
  }

  const outColumns: Column[] = [{ name: keyColumn, type: "string" }];
  const columnIndexByInput: number[][] = [];

  for (const { name, response } of inputs) {
    const indices: number[] = [];
    for (const col of response.columns) {
      if (col.name === keyColumn) {
        indices.push(-1);
        continue;
      }
      const outName = name ? `${name}_${col.name}` : col.name;
      let uniqueName = outName;
      let suffix = 2;
      while (outColumns.some((c) => c.name === uniqueName)) {
        uniqueName = `${outName}_${suffix}`;
        suffix++;
      }
      outColumns.push({ name: uniqueName, type: col.type });
      indices.push(outColumns.length - 1);
    }
    columnIndexByInput.push(indices);
  }

  const rows: unknown[][] = [];
  for (const keyValue of keyOrder) {
    const row: unknown[] = new Array(outColumns.length).fill(null);
    row[0] = keyValue;

    for (let i = 0; i < inputs.length; i++) {
      const { response } = inputs[i];
      const keyIdx = response.columns.findIndex((c) => c.name === keyColumn);
      if (keyIdx < 0) continue;

      const sourceRow = response.rows.find((r) => {
        const v = r[keyIdx];
        return (typeof v === "number" ? v : String(v)) === keyValue;
      });
      if (!sourceRow) continue;

      const indices = columnIndexByInput[i];
      for (let j = 0; j < response.columns.length; j++) {
        const outIdx = indices[j];
        if (outIdx >= 0) {
          row[outIdx] = sourceRow[j];
        }
      }
    }

    rows.push(row);
  }

  return { source: "merge", row_count: rows.length, columns: outColumns, rows };
}
