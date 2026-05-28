package api

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"stockcentral/internal/client"
)

// ---------- Types ----------

type PricePoint struct {
	Date  string  `json:"date"`
	Price float64 `json:"price"`
}

func toPricePoints(points []client.ChartPoint) []PricePoint {
	out := make([]PricePoint, len(points))
	for i, p := range points {
		out[i] = PricePoint{Date: p.Date, Price: p.Price}
	}
	return out
}

type MetricResponse struct {
	Symbol string  `json:"symbol"`
	Metric string  `json:"metric"`
	Value  float64 `json:"value"`
	Label  string  `json:"label"`
}

type NewsItem struct {
	Title     string `json:"title"`
	Source    string `json:"source"`
	Published string `json:"published"`
	Summary   string `json:"summary"`
}

type FearGreedData struct {
	Value         int    `json:"value"`
	PreviousValue int    `json:"previous_value"`
	Label         string `json:"label"`
	Timestamp     string `json:"timestamp"`
}

type RrgPoint struct {
	Date   string  `json:"date"`
	RS     float64 `json:"rs"`
	RM     float64 `json:"rm"`
}

type RrgTrail struct {
	Symbol string     `json:"symbol"`
	Points []RrgPoint `json:"points"`
}

type QuarterlyEarning struct {
	Date     string  `json:"date"`
	Actual   float64 `json:"actual"`
	Estimate float64 `json:"estimate"`
	BeatPct  float64 `json:"beat_pct"`
}

type ForwardPeData struct {
	Symbol           string             `json:"symbol"`
	ForwardPe        float64            `json:"forward_pe"`
	ForwardPeNextFY  float64            `json:"forward_pe_next_fy"`
	TrailingPe       float64            `json:"trailing_pe"`
	ForwardEps       float64            `json:"forward_eps"`
	ForwardEpsNextFY float64            `json:"forward_eps_next_fy"`
	EpsTrailing      float64            `json:"eps_trailing"`
	EpsGrowth        float64            `json:"eps_growth"`
	RevenueGrowth    float64            `json:"revenue_growth"`
	EpsRevision30d   float64            `json:"eps_revision_30d"`
	NumAnalysts      int                `json:"num_analysts"`
	EpsActualQ       float64            `json:"eps_actual_q"`
	EpsEstimateQ     float64            `json:"eps_estimate_q"`
	QuarterLabel     string             `json:"quarter_label"`
	EarningsHistory  []QuarterlyEarning `json:"earnings_history"`
	NextEarningsDate int64              `json:"next_earnings_date"`
	NextEarningsTime string             `json:"next_earnings_time"`
}

type RsiData struct {
	Symbol string  `json:"symbol"`
	Rsi    float64 `json:"rsi"`
}

type YtdData struct {
	Symbol string  `json:"symbol"`
	Ytd    float64 `json:"ytd"`
}

type MacroIndicator struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Value     float64 `json:"value"`
	Change    float64 `json:"change"`
	ChangePct float64 `json:"change_pct"`
}

type YieldCurveData struct {
	Yields map[string]float64 `json:"yields"`
	Spreads map[string]float64 `json:"spreads"`
}

type IndexPerformance struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Change    float64 `json:"change"`
	ChangePct float64 `json:"change_pct"`
	Ytd       float64 `json:"ytd"`
}

type BreadthPoint struct {
	Date    string  `json:"date"`
	Price   float64 `json:"price"`
	Ma50    float64 `json:"ma_50"`
	Ma200   float64 `json:"ma_200"`
}

type AssetClassData struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Price     float64 `json:"price"`
	Change1m  float64 `json:"change_1m"`
	Change3m  float64 `json:"change_3m"`
	Change6m  float64 `json:"change_6m"`
	Ytd       float64 `json:"ytd"`
}

type CreditSpreadPoint struct {
	Date   string  `json:"date"`
	Spread float64 `json:"spread"`
	HyPrice float64 `json:"hy_price"`
	IgPrice float64 `json:"ig_price"`
}

type RatioPoint struct {
	Date  string  `json:"date"`
	Ratio float64 `json:"ratio"`
}

type RatioData struct {
	Name   string       `json:"name"`
	Points []RatioPoint `json:"points"`
}

type TickerSearchResult struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
}

// ---------- Routes ----------

func (a *API) dataRoutes(r chi.Router) {
	r.Get("/price", a.getPriceHistory)
	r.Get("/metric", a.getMetric)
	r.Get("/news", a.getNews)
	r.Get("/fear-greed", a.getFearGreed)
	r.Get("/rrg", a.getRrg)
	r.Get("/forward-pe", a.getForwardPe)
	r.Get("/rsi", a.getRsi)
	r.Get("/ytd", a.getYtd)
	r.Get("/macro", a.getMacro)
	r.Get("/macro/yield-curve", a.getYieldCurve)
	r.Get("/macro/indexes", a.getIndexPerformance)
	r.Get("/macro/breadth", a.getBreadth)
	r.Get("/macro/asset-classes", a.getAssetClasses)
	r.Get("/macro/credit-spread", a.getCreditSpread)
	r.Get("/macro/ratios", a.getRatios)
	r.Get("/heatmap", a.getHeatmap)
	r.Get("/heatmap/universes", a.getHeatmapUniverses)
}

func (a *API) tickerRoutes(r chi.Router) {
	r.Get("/search", a.searchTickers)
}

// ---------- Handlers ----------

func (a *API) getPriceHistory(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL"}
	}
	rangeVal := r.URL.Query().Get("range")
	if rangeVal == "" {
		rangeVal = "1y"
	}

	result := make(map[string][]PricePoint)
	for _, sym := range symbols {
		points, err := client.GetChart(sym, rangeVal, "")
		if err != nil {
			// Skip symbols that fail to fetch rather than failing the whole batch
			continue
		}
		result[sym] = toPricePoints(points)
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getMetric(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL"}
	}
	metric := r.URL.Query().Get("metric")
	if metric == "" {
		metric = "price"
	}

	var result []MetricResponse
	for _, sym := range symbols {
		m, err := client.GetQuoteSummary(sym)
		if err != nil {
			// Skip symbols that fail to fetch rather than failing the whole batch
			continue
		}
		val, label := extractMetric(m, metric)
		result = append(result, MetricResponse{
			Symbol: sym,
			Metric: metric,
			Value:  val,
			Label:  label,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getNews(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL"}
	}
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 5
	}

	var result []NewsItem
	for i := 0; i < limit; i++ {
		sym := symbols[i%len(symbols)]
		result = append(result, NewsItem{
			Title:     sym + " " + mockNewsHeadlines[i%len(mockNewsHeadlines)],
			Source:    mockSources[i%len(mockSources)],
			Published: time.Now().Add(-time.Duration(i) * time.Hour).Format("2006-01-02 15:04"),
			Summary:   "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getFearGreed(w http.ResponseWriter, r *http.Request) {
	data, err := client.GetFearGreed()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, FearGreedData{
		Value:         data.CurrentValue,
		PreviousValue: data.PreviousValue,
		Label:         data.Label,
		Timestamp:     data.Timestamp,
	})
}

func (a *API) getRrg(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL", "MSFT", "GOOGL", "AMZN"}
	}
	benchmark := r.URL.Query().Get("benchmark")
	if benchmark == "" {
		benchmark = "SPY"
	}
	lookback := r.URL.Query().Get("lookback")
	if lookback == "" {
		lookback = "3m"
	}
	trailStr := r.URL.Query().Get("trail")
	trailLen, _ := strconv.Atoi(trailStr)
	if trailLen <= 0 {
		trailLen = 20
	}
	if trailLen > 60 {
		trailLen = 60
	}

	// Fetch data for each symbol + benchmark
	yahooRange := client.ToYahooRange(lookback)
	symData := make(map[string][]client.ChartPoint)
	var fetchErrors []string
	for _, sym := range append(symbols, benchmark) {
		points, err := client.GetChart(sym, yahooRange, "1d")
		if err != nil {
			fetchErrors = append(fetchErrors, fmt.Sprintf("%s: %v", sym, err))
			continue
		}
		symData[sym] = points
	}

	bench := symData[benchmark]
	if len(bench) < 15 {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("insufficient benchmark data for %s (%d points)", benchmark, len(bench)))
		return
	}

	var result []RrgTrail
	for _, sym := range symbols {
		points, ok := symData[sym]
		if !ok {
			continue // skip symbols that failed to fetch
		}
		trail := computeRRGTrail(sym, points, bench, trailLen)
		result = append(result, trail)
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getForwardPe(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"}
	}

	var result []ForwardPeData
	for _, sym := range symbols {
		m, err := client.GetQuoteSummary(sym)
		if err != nil {
			// Skip symbols that fail to fetch rather than failing the whole batch
			continue
		}
		history := make([]QuarterlyEarning, len(m.EarningsHistory))
		for i, h := range m.EarningsHistory {
			history[i] = QuarterlyEarning{
				Date:     h.Date,
				Actual:   math.Round(h.Actual*100) / 100,
				Estimate: math.Round(h.Estimate*100) / 100,
				BeatPct:  math.Round(h.BeatPct*10) / 10,
			}
		}
		result = append(result, ForwardPeData{
			Symbol:           sym,
			ForwardPe:        math.Round(m.PeForward*10) / 10,
			ForwardPeNextFY:  math.Round(m.PeForwardNextFY*10) / 10,
			TrailingPe:       math.Round(m.PeTrailing*10) / 10,
			ForwardEps:       math.Round(m.EpsForward*100) / 100,
			ForwardEpsNextFY: math.Round(m.EpsForwardNextFY*100) / 100,
			EpsTrailing:      math.Round(m.EpsTrailing*100) / 100,
			EpsGrowth:        math.Round(m.EpsGrowth*1000) / 1000,
			RevenueGrowth:    math.Round(m.RevenueGrowth*1000) / 1000,
			EpsRevision30d:   math.Round(m.EpsRevision30d*100) / 100,
			NumAnalysts:      m.NumAnalysts,
			EpsActualQ:       math.Round(m.EpsActualQ*100) / 100,
			EpsEstimateQ:     math.Round(m.EpsEstimateQ*100) / 100,
			QuarterLabel:     m.QuarterLabel,
			EarningsHistory:  history,
			NextEarningsDate: m.NextEarningsDate,
			NextEarningsTime: m.NextEarningsTime,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getRsi(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL", "MSFT"}
	}
	periodStr := r.URL.Query().Get("period")
	period, _ := strconv.Atoi(periodStr)
	if period <= 0 {
		period = 14
	}

	var result []RsiData
	for _, sym := range symbols {
		points, err := client.GetChart(sym, "6mo", "1d")
		if err != nil {
			// Skip symbols that fail to fetch rather than failing the whole batch
			continue
		}
		rsi := computeRSI(points, period)
		result = append(result, RsiData{Symbol: sym, Rsi: math.Round(rsi*10)/10})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getYtd(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL", "MSFT"}
	}

	var result []YtdData
	for _, sym := range symbols {
		points, err := client.GetChart(sym, "1y", "1d")
		if err != nil {
			// Skip symbols that fail to fetch rather than failing the whole batch
			continue
		}
		if len(points) < 2 {
			result = append(result, YtdData{Symbol: sym, Ytd: 0})
			continue
		}
		startPrice := points[0].Price
		endPrice := points[len(points)-1].Price
		if startPrice == 0 {
			result = append(result, YtdData{Symbol: sym, Ytd: 0})
			continue
		}
		ytd := ((endPrice - startPrice) / startPrice) * 100
		result = append(result, YtdData{Symbol: sym, Ytd: math.Round(ytd*100)/100})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getMacro(w http.ResponseWriter, r *http.Request) {
	// Macro indicators: VIX, 10Y Treasury, 5Y Treasury, S&P 500
	macroSymbols := []struct {
		Symbol string
		Name   string
	}{
		{"^VIX", "VIX"},
		{"^TNX", "10Y Treasury"},
		{"^FVX", "5Y Treasury"},
		{"^GSPC", "S&P 500"},
	}

	var result []MacroIndicator
	for _, ms := range macroSymbols {
		points, err := client.GetChart(ms.Symbol, "5d", "1d")
		if err != nil {
			points, err = client.GetChart(ms.Symbol, "1mo", "1d")
			if err != nil {
				// Skip symbols we can't fetch
				continue
			}
		}
		if len(points) < 2 {
			result = append(result, MacroIndicator{Symbol: ms.Symbol, Name: ms.Name, Value: 0})
			continue
		}
		current := points[len(points)-1].Price
		prev := points[len(points)-2].Price
		if len(points) >= 6 {
			prev = points[len(points)-6].Price // 5 days ago
		}
		change := current - prev
		changePct := 0.0
		if prev != 0 {
			changePct = (change / prev) * 100
		}
		result = append(result, MacroIndicator{
			Symbol:    ms.Symbol,
			Name:      ms.Name,
			Value:     math.Round(current*100) / 100,
			Change:    math.Round(change*100) / 100,
			ChangePct: math.Round(changePct*100) / 100,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getYieldCurve(w http.ResponseWriter, r *http.Request) {
	// Fetch treasury yields: 3M (^IRX), 5Y (^FVX), 10Y (^TNX), 30Y (^TYX)
	syms := []struct {
		Symbol string
		Key    string
	}{
		{"^IRX", "3m"},
		{"^FVX", "5y"},
		{"^TNX", "10y"},
		{"^TYX", "30y"},
	}

	yields := make(map[string]float64)
	for _, s := range syms {
		points, err := client.GetChart(s.Symbol, "5d", "1d")
		if err != nil {
			points, err = client.GetChart(s.Symbol, "1mo", "1d")
			if err != nil {
				// Skip yields we can't fetch
				continue
			}
		}
		if len(points) > 0 {
			yields[s.Key] = math.Round(points[len(points)-1].Price*100) / 100
		}
	}

	spreads := make(map[string]float64)
	if y10, ok := yields["10y"]; ok {
		if y3m, ok := yields["3m"]; ok {
			spreads["10y_3m"] = math.Round((y10-y3m)*100) / 100
		}
		if y5y, ok := yields["5y"]; ok {
			spreads["10y_5y"] = math.Round((y10-y5y)*100) / 100
		}
		if y30y, ok := yields["30y"]; ok {
			spreads["30y_10y"] = math.Round((y30y-y10)*100) / 100
		}
	}

	respondJSON(w, http.StatusOK, YieldCurveData{
		Yields:  yields,
		Spreads: spreads,
	})
}

func (a *API) getIndexPerformance(w http.ResponseWriter, r *http.Request) {
	indexSymbols := []struct {
		Symbol string
		Name   string
	}{
		{"^GSPC", "S&P 500"},
		{"^NDX", "Nasdaq 100"},
		{"^RUT", "Russell 2000"},
		{"^DJI", "Dow Jones"},
		{"^IXIC", "Nasdaq Composite"},
	}

	var result []IndexPerformance
	for _, idx := range indexSymbols {
		points, err := client.GetChart(idx.Symbol, "1y", "1d")
		if err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
		if len(points) < 2 {
			result = append(result, IndexPerformance{Symbol: idx.Symbol, Name: idx.Name})
			continue
		}

		current := points[len(points)-1].Price
		prev := points[len(points)-2].Price
		if len(points) >= 6 {
			prev = points[len(points)-6].Price
		}
		startPrice := points[0].Price

		change := current - prev
		changePct := 0.0
		if prev != 0 {
			changePct = (change / prev) * 100
		}
		ytd := 0.0
		if startPrice != 0 {
			ytd = ((current - startPrice) / startPrice) * 100
		}

		result = append(result, IndexPerformance{
			Symbol:    idx.Symbol,
			Name:      idx.Name,
			Price:     math.Round(current*100) / 100,
			Change:    math.Round(change*100) / 100,
			ChangePct: math.Round(changePct*100) / 100,
			Ytd:       math.Round(ytd*100) / 100,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getBreadth(w http.ResponseWriter, r *http.Request) {
	// Fetch S&P 500 price history for 1y and compute 50-day and 200-day MAs
	points, err := client.GetChart("^GSPC", "1y", "1d")
	if err != nil {
		// Fallback to SPY if ^GSPC fails
		points, err = client.GetChart("SPY", "1y", "1d")
		if err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
	}

	var result []BreadthPoint
	for i, p := range points {
		bp := BreadthPoint{Date: p.Date, Price: math.Round(p.Price*100) / 100}
		if i >= 49 {
			bp.Ma50 = math.Round(sma(points[i-49:i+1])*100) / 100
		}
		if i >= 199 {
			bp.Ma200 = math.Round(sma(points[i-199:i+1])*100) / 100
		}
		result = append(result, bp)
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getAssetClasses(w http.ResponseWriter, r *http.Request) {
	assets := []struct {
		Symbol   string
		Name     string
		Category string
	}{
		{"SPY", "US Large Cap", "Equities"},
		{"VTI", "US Total Market", "Equities"},
		{"VEA", "Developed Intl", "Equities"},
		{"VWO", "Emerging Markets", "Equities"},
		{"QQQ", "Nasdaq 100", "Equities"},
		{"IWM", "Russell 2000", "Equities"},
		{"BND", "US Aggregate Bonds", "Bonds"},
		{"TLT", "Long-Term Treasuries", "Bonds"},
		{"LQD", "Inv. Grade Corp", "Bonds"},
		{"HYG", "High Yield Corp", "Bonds"},
		{"GLD", "Gold", "Commodities"},
		{"USO", "Crude Oil", "Commodities"},
		{"SLV", "Silver", "Commodities"},
		{"DBA", "Agriculture", "Commodities"},
		{"UUP", "US Dollar", "Currencies"},
		{"FXE", "Euro", "Currencies"},
		{"FXY", "Japanese Yen", "Currencies"},
		{"VNQ", "Real Estate", "Real Estate"},
	}

	var result []AssetClassData
	for _, a := range assets {
		points, err := client.GetChart(a.Symbol, "1y", "1d")
		if err != nil {
			// Skip assets we can't fetch
			continue
		}
		if len(points) < 2 {
			continue
		}
		current := points[len(points)-1].Price
		result = append(result, AssetClassData{
			Symbol:   a.Symbol,
			Name:     a.Name,
			Category: a.Category,
			Price:    math.Round(current*100) / 100,
			Change1m: math.Round(computeReturn(points, 21)*100) / 100,
			Change3m: math.Round(computeReturn(points, 63)*100) / 100,
			Change6m: math.Round(computeReturn(points, 126)*100) / 100,
			Ytd:      math.Round(computeReturn(points, len(points)-1)*100) / 100,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getCreditSpread(w http.ResponseWriter, r *http.Request) {
	// Proxy credit spread using HYG (high yield) vs LQD (investment grade)
	hyPoints, err := client.GetChart("HYG", "1y", "1d")
	if err != nil {
		respondJSON(w, http.StatusOK, []CreditSpreadPoint{})
		return
	}
	igPoints, err := client.GetChart("LQD", "1y", "1d")
	if err != nil {
		respondJSON(w, http.StatusOK, []CreditSpreadPoint{})
		return
	}

	minLen := len(hyPoints)
	if len(igPoints) < minLen {
		minLen = len(igPoints)
	}

	var result []CreditSpreadPoint
	for i := 0; i < minLen; i++ {
		hy := hyPoints[i].Price
		ig := igPoints[i].Price
		if ig > 0 {
			spread := (hy / ig - 1) * 100
			result = append(result, CreditSpreadPoint{
				Date:    hyPoints[i].Date,
				Spread:  math.Round(spread*100) / 100,
				HyPrice: math.Round(hy*100) / 100,
				IgPrice: math.Round(ig*100) / 100,
			})
		}
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getRatios(w http.ResponseWriter, r *http.Request) {
	ratios := []struct {
		Num   string
		Den   string
		Name  string
	}{
		{"CPER", "GLD", "Copper / Gold"},
		{"XLY", "XLP", "Discretionary / Staples"},
		{"XLK", "XLU", "Tech / Utilities"},
		{"IWM", "SPY", "Small Cap / Large Cap"},
		{"VWO", "VEA", "Emerging / Developed"},
	}

	var result []RatioData
	for _, r := range ratios {
		numPoints, err := client.GetChart(r.Num, "1y", "1d")
		if err != nil {
			continue
		}
		denPoints, err := client.GetChart(r.Den, "1y", "1d")
		if err != nil {
			continue
		}
		points := alignAndRatio(numPoints, denPoints)
		result = append(result, RatioData{
			Name:   r.Name,
			Points: points,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) searchTickers(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		respondJSON(w, http.StatusOK, []TickerSearchResult{})
		return
	}

	results, err := client.SearchTickers(query)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	var out []TickerSearchResult
	for _, r := range results {
		name := r.LongName
		if name == "" {
			name = r.ShortName
		}
		out = append(out, TickerSearchResult{
			Symbol:   r.Symbol,
			Name:     name,
			Exchange: r.Exchange,
		})
	}
	respondJSON(w, http.StatusOK, out)
}

// ---------- Helpers ----------

func parseSymbols(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(strings.ToUpper(p))
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func extractMetric(m *client.QuoteMetrics, metric string) (float64, string) {
	switch metric {
	case "price":
		return m.Price, fmt.Sprintf("$%.2f", m.Price)
	case "volume":
		return float64(m.Volume), formatVolume(m.Volume)
	case "pe":
		pe := m.PeForward
		if pe == 0 {
			pe = m.PeTrailing
		}
		return pe, fmt.Sprintf("%.1fx", pe)
	case "market_cap":
		return m.MarketCap, formatMarketCap(m.MarketCap)
	case "dividend_yield":
		return m.DivYield * 100, fmt.Sprintf("%.2f%%", m.DivYield*100)
	default:
		return m.Price, fmt.Sprintf("$%.2f", m.Price)
	}
}

func formatVolume(v int64) string {
	if v >= 1_000_000_000 {
		return fmt.Sprintf("%.1fB", float64(v)/1_000_000_000)
	}
	if v >= 1_000_000 {
		return fmt.Sprintf("%.1fM", float64(v)/1_000_000)
	}
	if v >= 1_000 {
		return fmt.Sprintf("%.1fK", float64(v)/1_000)
	}
	return strconv.FormatInt(v, 10)
}

func formatMarketCap(v float64) string {
	if v >= 1_000_000_000_000 {
		return fmt.Sprintf("$%.1fT", v/1_000_000_000_000)
	}
	if v >= 1_000_000_000 {
		return fmt.Sprintf("$%.1fB", v/1_000_000_000)
	}
	if v >= 1_000_000 {
		return fmt.Sprintf("$%.1fM", v/1_000_000)
	}
	return fmt.Sprintf("$%.0f", v)
}

// computeRRGTrail calculates a rolling trail of RRG points.
// Each point uses a 10-day window for RS and a 5-day window for RM.
func computeRRGTrail(symbol string, symPoints, benchPoints []client.ChartPoint, trailLen int) RrgTrail {
	if len(symPoints) < 15 || len(benchPoints) < 15 {
		return RrgTrail{Symbol: symbol, Points: []RrgPoint{{Date: "", RS: 50, RM: 50}}}
	}

	// Align the two series by date (they should already be aligned from Yahoo)
	minLen := len(symPoints)
	if len(benchPoints) < minLen {
		minLen = len(benchPoints)
	}

	// Rolling window sizes
	rsWindow := 10
	rmWindow := 5

	var points []RrgPoint
	for i := rsWindow + rmWindow; i < minLen; i++ {
		// RS: relative performance over rsWindow days
		symNow := symPoints[i].Price
		symThen := symPoints[i-rsWindow].Price
		benchNow := benchPoints[i].Price
		benchThen := benchPoints[i-rsWindow].Price

		if benchThen == 0 || symThen == 0 || benchNow == 0 {
			continue
		}

		relNow := symNow / benchNow
		relThen := symThen / benchThen
		rs := 50 + (relNow/relThen-1)*500
		rs = clamp(rs, 0, 100)

		// RM: momentum of RS over rmWindow days
		symMid := symPoints[i-rmWindow].Price
		benchMid := benchPoints[i-rmWindow].Price
		var rm float64
		if benchMid > 0 && symMid > 0 {
			relMid := symMid / benchMid
			rm = 50 + (relNow/relMid-1)*500
			rm = clamp(rm, 0, 100)
		} else {
			rm = 50
		}

		points = append(points, RrgPoint{
			Date: symPoints[i].Date,
			RS:   math.Round(rs*10) / 10,
			RM:   math.Round(rm*10) / 10,
		})
	}

	// Take only the last trailLen points
	if len(points) > trailLen {
		points = points[len(points)-trailLen:]
	}

	return RrgTrail{Symbol: symbol, Points: points}
}

func computeRSI(points []client.ChartPoint, period int) float64 {
	if len(points) < period+1 {
		return 50
	}
	var gains, losses float64
	for i := 1; i <= period; i++ {
		change := points[i].Price - points[i-1].Price
		if change > 0 {
			gains += change
		} else {
			losses += -change
		}
	}
	avgGain := gains / float64(period)
	avgLoss := losses / float64(period)

	for i := period + 1; i < len(points); i++ {
		change := points[i].Price - points[i-1].Price
		var gain, loss float64
		if change > 0 {
			gain = change
		} else {
			loss = -change
		}
		avgGain = (avgGain*float64(period-1) + gain) / float64(period)
		avgLoss = (avgLoss*float64(period-1) + loss) / float64(period)
	}

	if avgLoss == 0 {
		return 100
	}
	rs := avgGain / avgLoss
	rsi := 100 - (100 / (1 + rs))
	return clamp(rsi, 0, 100)
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func sma(points []client.ChartPoint) float64 {
	if len(points) == 0 {
		return 0
	}
	var sum float64
	for _, p := range points {
		sum += p.Price
	}
	return sum / float64(len(points))
}

func computeReturn(points []client.ChartPoint, lookback int) float64 {
	if len(points) < lookback+1 {
		return 0
	}
	current := points[len(points)-1].Price
	past := points[len(points)-1-lookback].Price
	if past == 0 {
		return 0
	}
	return ((current - past) / past) * 100
}

func alignAndRatio(numPoints, denPoints []client.ChartPoint) []RatioPoint {
	// Build a map from denominator by date
	denMap := make(map[string]float64)
	for _, p := range denPoints {
		denMap[p.Date] = p.Price
	}

	var result []RatioPoint
	for _, p := range numPoints {
		if d, ok := denMap[p.Date]; ok && d > 0 {
			result = append(result, RatioPoint{
				Date:  p.Date,
				Ratio: math.Round((p.Price/d)*1000) / 1000,
			})
		}
	}
	return result
}

var mockNewsHeadlines = []string{
	"beats Q3 earnings expectations",
	"announces new product line",
	"stock rises on analyst upgrade",
	"faces regulatory scrutiny in EU",
	"partners with major semiconductor firm",
	"CEO to keynote upcoming tech conference",
	"expands into emerging markets",
}

var mockSources = []string{
	"Bloomberg", "Reuters", "CNBC", "MarketWatch", "Financial Times",
}
