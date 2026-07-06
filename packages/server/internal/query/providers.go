package query

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"stockcentral/internal/client"
)

// PriceHistoryProvider returns time-series price data for one or more symbols.
//
// Params:
//   - symbol: string or []string (required)
//   - range:  string, e.g. "1d", "1mo", "1y" (default "1y")
//   - interval: string, e.g. "1m", "1h", "1d" (default "1d")
//   - close_only: bool, if true return only close prices as "price" column,
//     otherwise return open/high/low/close/volume columns.
type PriceHistoryProvider struct{}

func (PriceHistoryProvider) Source() string { return "price_history" }

func (PriceHistoryProvider) Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error) {
	symbols := parseSymbols(params["symbol"])
	if len(symbols) == 0 {
		return nil, fmt.Errorf("price_history requires symbol param")
	}
	rng := stringParam(params, "range", "1y")
	interval := stringParam(params, "interval", "1d")
	closeOnly := boolParam(params, "close_only", false)

	// Fetch all symbols and align to a common date index. We return one row per
	// date so the result is easy to chart.
	type series struct {
		symbol string
		points []client.ChartPoint
	}
	all := make([]series, 0, len(symbols))
	dateSet := make(map[string]struct{})
	for _, sym := range symbols {
		pts, err := client.GetChart(sym, rng, interval)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch %s: %w", sym, err)
		}
		all = append(all, series{symbol: sym, points: pts})
		for _, p := range pts {
			dateSet[p.Date] = struct{}{}
		}
	}

	if len(dateSet) == 0 {
		return Empty([]Column{{Name: "date", Type: ColumnTypeTime}}), nil
	}

	dates := sortedDates(dateSet)
	idxByDate := make(map[string]int, len(dates))
	for i, d := range dates {
		idxByDate[d] = i
	}

	columns := []Column{{Name: "date", Type: ColumnTypeTime}}
	if closeOnly {
		for _, s := range all {
			columns = append(columns, Column{Name: s.symbol, Type: ColumnTypeNumber})
		}
	} else {
		for _, s := range all {
			columns = append(columns,
				Column{Name: s.symbol + "_open", Type: ColumnTypeNumber},
				Column{Name: s.symbol + "_high", Type: ColumnTypeNumber},
				Column{Name: s.symbol + "_low", Type: ColumnTypeNumber},
				Column{Name: s.symbol + "_close", Type: ColumnTypeNumber},
				Column{Name: s.symbol + "_volume", Type: ColumnTypeNumber},
			)
		}
	}

	// Build a matrix of NaN values per date.
	rows := make([][]interface{}, len(dates))
	for i := range dates {
		row := make([]interface{}, len(columns))
		row[0] = dates[i]
		for j := 1; j < len(columns); j++ {
			row[j] = nil
		}
		rows[i] = row
	}

	colIdx := map[string]int{}
	for i, c := range columns {
		colIdx[c.Name] = i
	}

	for _, s := range all {
		if closeOnly {
			for _, p := range s.points {
				rows[idxByDate[p.Date]][colIdx[s.symbol]] = p.Price
			}
			continue
		}
		candles, err := client.GetCandles(s.symbol, rng, interval)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch candles %s: %w", s.symbol, err)
		}
		for _, c := range candles {
			row := rows[idxByDate[c.Date]]
			row[colIdx[s.symbol+"_open"]] = c.Open
			row[colIdx[s.symbol+"_high"]] = c.High
			row[colIdx[s.symbol+"_low"]] = c.Low
			row[colIdx[s.symbol+"_close"]] = c.Close
			row[colIdx[s.symbol+"_volume"]] = float64(c.Volume)
		}
	}

	return &DataFrame{Columns: columns, Rows: rows}, nil
}

// MetricProvider returns quote/fundamental metric values for one or more symbols.
//
// Params:
//   - symbol: string or []string (required)
//   - metric: string, e.g. "price", "pe_forward", "market_cap" (default "price")
type MetricProvider struct{}

func (MetricProvider) Source() string { return "metric" }

func (MetricProvider) Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error) {
	symbols := parseSymbols(params["symbol"])
	if len(symbols) == 0 {
		return nil, fmt.Errorf("metric requires symbol param")
	}
	metric := stringParam(params, "metric", "price")

	columns := []Column{
		{Name: "symbol", Type: ColumnTypeString},
		{Name: "metric", Type: ColumnTypeString},
		{Name: "value", Type: ColumnTypeNumber},
		{Name: "label", Type: ColumnTypeString},
	}
	rows := make([][]interface{}, 0, len(symbols))

	for _, sym := range symbols {
		m, err := client.GetQuoteSummary(sym)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch quote %s: %w", sym, err)
		}
		val, label := extractMetric(m, metric)
		rows = append(rows, []interface{}{sym, metric, val, label})
	}

	return &DataFrame{Columns: columns, Rows: rows}, nil
}

// FredProvider returns macro time-series observations from FRED.
//
// Params:
//   - series_id: string or []string (required)
//   - limit: int, number of observations per series (default 252)
type FredProvider struct{}

func (FredProvider) Source() string { return "fred" }

func (FredProvider) Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error) {
	seriesIDs := parseStrings(params["series_id"])
	if len(seriesIDs) == 0 {
		return nil, fmt.Errorf("fred requires series_id param")
	}
	limit := intParam(params, "limit", 252)

	// Fetch each series and collect all dates.
	type series struct {
		id   string
		obs  []client.FredObservation
		vals map[string]float64
	}
	all := make([]series, 0, len(seriesIDs))
	dateSet := make(map[string]struct{})
	for _, id := range seriesIDs {
		obs, err := client.GetFredSeries(id, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch fred %s: %w", id, err)
		}
		vals := make(map[string]float64, len(obs))
		for _, o := range obs {
			v, _ := strconv.ParseFloat(o.Value, 64)
			vals[o.Date] = v
			dateSet[o.Date] = struct{}{}
		}
		all = append(all, series{id: id, obs: obs, vals: vals})
	}

	dates := sortedDates(dateSet)
	idxByDate := make(map[string]int, len(dates))
	for i, d := range dates {
		idxByDate[d] = i
	}

	columns := []Column{{Name: "date", Type: ColumnTypeTime}}
	colIdx := map[string]int{"date": 0}
	for i, s := range all {
		columns = append(columns, Column{Name: s.id, Type: ColumnTypeNumber})
		colIdx[s.id] = i + 1
	}

	rows := make([][]interface{}, len(dates))
	for i, d := range dates {
		row := make([]interface{}, len(columns))
		row[0] = d
		for j := 1; j < len(columns); j++ {
			row[j] = nil
		}
		rows[i] = row
	}
	for _, s := range all {
		for date, v := range s.vals {
			rows[idxByDate[date]][colIdx[s.id]] = v
		}
	}

	return &DataFrame{Columns: columns, Rows: rows}, nil
}

// ---------- helpers ----------

func parseSymbols(v interface{}) []string {
	return parseStrings(v)
}

func parseStrings(v interface{}) []string {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok {
		if s == "" {
			return nil
		}
		parts := strings.Split(s, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		return out
	}
	if arr, ok := v.([]interface{}); ok {
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, strings.TrimSpace(s))
			}
		}
		return out
	}
	return nil
}

func stringParam(params map[string]interface{}, key, def string) string {
	v, ok := params[key]
	if !ok {
		return def
	}
	if s, ok := v.(string); ok {
		if s = strings.TrimSpace(s); s != "" {
			return s
		}
	}
	return def
}

func boolParam(params map[string]interface{}, key string, def bool) bool {
	v, ok := params[key]
	if !ok {
		return def
	}
	if b, ok := v.(bool); ok {
		return b
	}
	return def
}

func intParam(params map[string]interface{}, key string, def int) int {
	v, ok := params[key]
	if !ok {
		return def
	}
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	case string:
		if i, err := strconv.Atoi(strings.TrimSpace(n)); err == nil {
			return i
		}
	}
	return def
}

func sortedDates(set map[string]struct{}) []string {
	out := make([]string, 0, len(set))
	for d := range set {
		out = append(out, d)
	}
	// Dates are ISO 8601 (YYYY-MM-DD), so lexical sort == chronological sort.
	// For mixed granularities this is still correct.
	sortStrings(out)
	return out
}

func sortStrings(a []string) {
	for i := 0; i < len(a); i++ {
		for j := i + 1; j < len(a); j++ {
			if a[j] < a[i] {
				a[i], a[j] = a[j], a[i]
			}
		}
	}
}

// extractMetric mirrors the logic in internal/api/data.go so that query results
// match the existing /data/metric endpoint semantics.
func extractMetric(m *client.QuoteMetrics, metric string) (float64, string) {
	switch strings.ToLower(metric) {
	case "price":
		return m.Price, "Price"
	case "pe_trailing", "pe":
		return m.PeTrailing, "P/E (TTM)"
	case "pe_forward", "forward_pe":
		return m.PeForward, "Forward P/E"
	case "pe_forward_next_fy":
		return m.PeForwardNextFY, "Forward P/E Next FY"
	case "market_cap":
		return m.MarketCap, "Market Cap"
	case "dividend_yield", "div_yield":
		return m.DivYield, "Dividend Yield"
	case "short_ratio":
		return m.ShortRatio, "Short Ratio"
	case "short_percent_float":
		return m.ShortPercentFloat, "Short % Float"
	case "volume":
		return float64(m.Volume), "Volume"
	case "eps_trailing":
		return m.EpsTrailing, "EPS (TTM)"
	case "eps_forward":
		return m.EpsForward, "EPS Forward"
	case "eps_forward_next_fy":
		return m.EpsForwardNextFY, "EPS Forward Next FY"
	case "eps_growth":
		return m.EpsGrowth, "EPS Growth"
	case "revenue_growth":
		return m.RevenueGrowth, "Revenue Growth"
	case "eps_revision_30d":
		return m.EpsRevision30d, "EPS Revision 30d"
	case "num_analysts":
		return float64(m.NumAnalysts), "# Analysts"
	case "target_low":
		return m.TargetLow, "Target Low"
	case "target_mean":
		return m.TargetMean, "Target Mean"
	case "target_high":
		return m.TargetHigh, "Target High"
	case "num_analyst_opinions":
		return float64(m.NumAnalystOpinions), "# Opinions"
	default:
		return m.Price, "Price"
	}
}
