/** Shared candlestick / volume color palette used across all charts. */
export const CANDLE_COLORS = {
  up: "#22c55e",
  down: "#ef4444",
  volume: "#9ca3af",
  volumeUp: "#22c55e66",
  volumeDown: "#ef444466",
} as const;

/** Default options for a CandlestickSeries so they stay consistent. */
export const candlestickSeriesOptions = {
  upColor: CANDLE_COLORS.up,
  downColor: CANDLE_COLORS.down,
  borderUpColor: CANDLE_COLORS.up,
  borderDownColor: CANDLE_COLORS.down,
  wickUpColor: CANDLE_COLORS.up,
  wickDownColor: CANDLE_COLORS.down,
} as const;
