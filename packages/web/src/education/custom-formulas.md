# Custom Formulas in Charts

The chart section on each ticker page includes a **Custom Formula** tool that lets you build your own indicators on top of price, volume, and technical data. Instead of relying only on pre-built overlays, you can combine functions, adjust parameters, and visualize exactly the signal you care about.

## Why Use Custom Formulas?

- **Spot relationships the default charts miss.** For example, plot the gap between price and a moving average, or combine RSI and MACD into a single normalized line.
- **Test a hypothesis quickly.** Wondering whether volatility is expanding relative to price? Write `atr(14) / close()` and see it immediately.
- **Keep your setup clean.** One custom line can replace multiple separate indicators.
- **Adapt as you watch.** You can tweak periods and coefficients in real time as the chart evolves.

## Available Building Blocks

The formula parser understands the following functions and operators.

### Price Data

| Function | Description |
|----------|-------------|
| `close()` | Closing price |
| `open()` | Opening price |
| `high()` | High price |
| `low()` | Low price |
| `volume()` | Trading volume |
| `hl2()` | `(high + low) / 2` |
| `hlc3()` | `(high + low + close) / 3` |
| `ohlc4()` | `(open + high + low + close) / 4` |

### Moving Averages

| Function | Description |
|----------|-------------|
| `sma(period)` | Simple Moving Average of close |
| `ema(period)` | Exponential Moving Average of close |
| `wma(period)` | Weighted Moving Average of close |
| `hma(period)` | Hull Moving Average of close |
| `vwma(period)` | Volume Weighted Moving Average |

### Oscillators

| Function | Description |
|----------|-------------|
| `rsi(period)` | Relative Strength Index (0–100) |
| `macd(fast, slow, signal)` | MACD line |
| `macd_signal(fast, slow, signal)` | MACD signal line |
| `macd_hist(fast, slow, signal)` | MACD histogram |
| `stoch_k(period)` | Stochastic %K |
| `stoch_d(period, smooth)` | Stochastic %D (SMA of %K) |
| `williams_r(period)` | Williams %R (–100 to 0) |
| `cci(period)` | Commodity Channel Index |
| `mfi(period)` | Money Flow Index (0–100) |

### Bollinger Bands & Volatility

| Function | Description |
|----------|-------------|
| `bb_upper(period, multiplier)` | Upper Bollinger Band |
| `bb_middle(period)` | Middle band (SMA) |
| `bb_lower(period, multiplier)` | Lower Bollinger Band |
| `atr(period)` | Average True Range |
| `stddev(period)` | Standard Deviation of close |
| `tr()` | True Range |

### Volume

| Function | Description |
|----------|-------------|
| `obv()` | On Balance Volume |

### Operators

Use `+`, `-`, `*`, `/`, parentheses `()`, and unary minus `-expr` to combine any of the functions above.

## Common Examples

| Goal | Formula |
|------|---------|
| Simple RSI overlay | `rsi(14)` |
| Price distance from 20-day SMA | `close() - sma(20)` |
| MACD histogram | `macd(12,26,9) - macd_signal(12,26,9)` |
| Bollinger Band width as a ratio | `(bb_upper(20,2) - bb_lower(20,2)) / bb_middle(20)` |
| Blended momentum score | `rsi(14) * 0.5 + macd_hist(12,26,9) * 0.5` |
| Volatility relative to price | `atr(14) / close()` |
| Volume-weighted OBV signal | `obv() / vwma(20)` |

## How to Customize as You Observe

The real value of custom formulas comes from iteration. Here is a practical workflow:

1. **Start with a question.** Example: *“Is this stock extending far above its average?”*
2. **Write the simplest version.** `close() - sma(20)` shows the raw dollar distance.
3. **Normalize it.** `((close() - sma(20)) / sma(20)) * 100` turns it into a percentage, which is easier to compare across stocks.
4. **Add a condition.** `(close() - sma(20)) / atr(14)` compares the distance to recent volatility.
5. **Tune the period.** A 20-day SMA works for swing trades; try `sma(50)` or `sma(200)` for longer trends.
6. **Watch for divergence.** If price makes a new high but your custom momentum line does not, that is a warning signal worth investigating.

## Tips for Reliable Formulas

- **Keep units consistent.** Adding a price value to an RSI value rarely makes sense unless you normalize both first.
- **Avoid overfitting.** A formula that looks perfect on the last 30 days may fail on the next 30.
- **Name your formulas.** Give each one a short description so you remember what it measures when you come back later.
- **Use unary minus carefully.** `-rsi(14)` flips the oscillator, which can be useful for visualizing inverse patterns.

## Next Steps

Custom formulas are most powerful when paired with a clear investing style. See the [How to Discover the Next Stock](/education/discover-stocks) page to decide what kind of signals you should actually be looking for.
