import { useMemo } from "react";
import { dataApi } from "../../../lib/api";
import { usePanelData } from "../../_core";
import type { QueryResponse } from "../../../lib/query/types";
import type { PanelQuery } from "../lib/buildPanelQuery";
import { mergeQueryResponses } from "../lib/mergeDataFrames";

function isPanelQueryArray(input: PanelQuery | PanelQuery[]): input is PanelQuery[] {
  return Array.isArray(input);
}

function buildQueryKey(input: PanelQuery | PanelQuery[]): string {
  if (isPanelQueryArray(input)) {
    return JSON.stringify(input.map((q) => q.spec));
  }
  return JSON.stringify(input.spec);
}

export function useQueryChart(query: PanelQuery | PanelQuery[], refreshKey: number) {
  const queryKey = useMemo(() => buildQueryKey(query), [query]);

  return usePanelData<QueryResponse>(
    async () => {
      if (isPanelQueryArray(query)) {
        const results = await Promise.all(
          query.map(async (q) => {
            const response = await dataApi.query(q.spec);
            return { name: q.name, response };
          })
        );
        return mergeQueryResponses(results);
      }
      return dataApi.query(query.spec);
    },
    [queryKey, refreshKey]
  );
}
