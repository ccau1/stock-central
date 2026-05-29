import { useMemo } from "react";
import type { PanelProps } from "./types";
import { PanelContainer } from "./PanelContainer";
import { PanelLoading } from "./PanelLoading";
import { PanelError } from "./PanelError";
import { usePanelData } from "./usePanelData";

export interface PanelState<T> {
  data: T | null;
  error: string | null;
  container: React.ReactNode | null;
}

export function usePanel<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  props: PanelProps,
  options?: { noPadding?: boolean }
): PanelState<T> {
  const { data, loading, error } = usePanelData(fetcher, deps);

  const container = useMemo(() => {
    if (loading && !data) {
      return (
        <PanelContainer
          title={props.title}
          onRefresh={props.onRefresh}
          loading={true}
          description={props.description}
          noPadding={options?.noPadding}
        >
          <PanelLoading />
        </PanelContainer>
      );
    }
    return null;
  }, [loading, data, props.title, props.onRefresh, props.description, options?.noPadding]);

  return { data, error, container };
}

export function renderPanelError(error: string | null): React.ReactNode {
  if (!error) return null;
  return <PanelError message={error} />;
}
