import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi, type PricePoint } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import ComparisonChart from "../../components/ComparisonChart";

const RATIO_KEY = "VXN/VIX";

function computeRatioSeries(
  vxn?: PricePoint[],
  vix?: PricePoint[]
): Record<string, PricePoint[]> | null {
  if (!vxn?.length || !vix?.length) return null;

  const vixByDate = new Map<string, number>();
  for (const p of vix) {
    vixByDate.set(p.date, p.price);
  }

  const ratio: PricePoint[] = [];
  for (const p of vxn) {
    const denom = vixByDate.get(p.date);
    if (denom && denom !== 0) {
      ratio.push({ date: p.date, price: p.price / denom });
    }
  }

  if (ratio.length === 0) return null;
  return { [RATIO_KEY]: ratio };
}

export function VxnVixRatioPanel({
  title,
  refreshKey,
  onRefresh,
  onExpand,
  description,
}: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(["^VXN", "^VIX"], "1y"),
    [refreshKey]
  );

  if (loading && !data) {
    return (
      <PanelContainer
        title={title}
        onRefresh={onRefresh}
        onExpand={onExpand}
        loading={true}
        description={description}
      >
        <PanelLoading />
      </PanelContainer>
    );
  }

  const ratioData = computeRatioSeries(data?.["^VXN"], data?.["^VIX"]);
  const points = ratioData?.[RATIO_KEY];
  const current = points && points.length > 0 ? points[points.length - 1].price : 0;
  const prev = points && points.length > 1 ? points[points.length - 2].price : current;
  const change = current - prev;
  const changePct = prev !== 0 ? (change / prev) * 100 : 0;

  let sentiment = "Balanced";
  let sentimentColor = "text-gray-600";
  if (current > 1.15) {
    sentiment = "Tech Fear";
    sentimentColor = "text-red-600";
  } else if (current < 0.95) {
    sentiment = "Tech Complacency";
    sentimentColor = "text-green-600";
  }

  return (
    <PanelContainer
      title={title}
      onRefresh={onRefresh}
      onExpand={onExpand}
      loading={loading}
      description={description}
    >
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-4 px-3 py-2 mb-1">
          <div>
            <div className="text-2xl font-bold text-gray-800">{current.toFixed(2)}</div>
          </div>
          <div
            className={`text-sm font-semibold ${
              change >= 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} ({changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%)
          </div>
          <div className={`text-sm font-semibold ${sentimentColor}`}>{sentiment}</div>
        </div>
        {ratioData && (
          <div className="flex-1 min-h-0">
            <ComparisonChart data={ratioData} symbols={[RATIO_KEY]} mode="price" baseline="auto" />
          </div>
        )}
      </div>
    </PanelContainer>
  );
}

export const vxnVixRatioPanel: PanelDefinition = {
  id: "vxn-vix-ratio",
  name: "VXN / VIX Ratio",
  description:
    "Ratio of CBOE Nasdaq-100 Volatility (VXN) to CBOE S&P 500 Volatility (VIX). Readings above ~1.15 suggest tech-led fear, while readings below ~0.95 suggest broad-market fear or tech complacency.",
  categories: ["macro"],
  component: VxnVixRatioPanel,
  filterConfig: { tickerMode: "none" },
};
