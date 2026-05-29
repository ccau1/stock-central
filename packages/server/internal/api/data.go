package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"codeberg.org/readeck/go-readability/v2"
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
	URL       string `json:"url"`
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

type RecessionIndicator struct {
	Name        string  `json:"name"`
	Value       float64 `json:"value"`
	Change1m    float64 `json:"change_1m"`
	Signal      string  `json:"signal"`
	Description string  `json:"description"`
}

type RecessionRiskData struct {
	Indicators []RecessionIndicator `json:"indicators"`
	RiskScore  int                  `json:"risk_score"`
	RiskLabel  string               `json:"risk_label"`
}

type FrothIndicator struct {
	Name        string  `json:"name"`
	Value       float64 `json:"value"`
	Change1m    float64 `json:"change_1m"`
	Signal      string  `json:"signal"`
	Description string  `json:"description"`
}

type FrothData struct {
	Indicators []FrothIndicator `json:"indicators"`
	FrothScore int              `json:"froth_score"`
	FrothLabel string           `json:"froth_label"`
}

type ValuationPoint struct {
	Date  string  `json:"date"`
	Price float64 `json:"price"`
	Ma200 float64 `json:"ma_200"`
}

type ValuationData struct {
	Current   float64          `json:"current"`
	Ma200     float64          `json:"ma_200"`
	Premium   float64          `json:"premium"`
	History   []ValuationPoint `json:"history"`
	ForwardPE float64          `json:"forward_pe"`
}

type IPOEntry struct {
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Date      string `json:"date"`
	Exchange  string `json:"exchange"`
	PriceRange string `json:"price_range"`
	Shares    int64  `json:"shares"`
	DealSize  int64  `json:"deal_size"`
	MarketCap int64  `json:"market_cap"`
	Revenue   int64  `json:"revenue"`
	Status    string `json:"status"`
}

type TickerSearchResult struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
}

type OptionsData struct {
	Symbol             string  `json:"symbol"`
	CallVolume         int64   `json:"call_volume"`
	PutVolume          int64   `json:"put_volume"`
	CallOI             int64   `json:"call_oi"`
	PutOI              int64   `json:"put_oi"`
	PutCallVolumeRatio float64 `json:"put_call_volume_ratio"`
	PutCallOIRatio     float64 `json:"put_call_oi_ratio"`
}

type CandleResponse struct {
	Date   string  `json:"date"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume int64   `json:"volume"`
}

type IndicatorPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

type IndicatorSeries struct {
	Name   string           `json:"name"`
	Points []IndicatorPoint `json:"points"`
}

type IndicatorsResponse struct {
	Symbol     string            `json:"symbol"`
	Indicators []IndicatorSeries `json:"indicators"`
}

type FormulaRequest struct {
	Symbol   string `json:"symbol"`
	Range    string `json:"range"`
	Interval string `json:"interval"`
	Formula  string `json:"formula"`
}

type FormulaResponse struct {
	Symbol string           `json:"symbol"`
	Name   string           `json:"name"`
	Points []IndicatorPoint `json:"points"`
}


// ---------- Routes ----------

func (a *API) dataRoutes(r chi.Router) {
	r.Get("/price", a.getPriceHistory)
	r.Get("/candles", a.getCandles)
	r.Get("/indicators", a.getIndicators)
	r.Post("/formula", a.postFormula)
	r.Get("/metric", a.getMetric)
	r.Get("/news", a.getNews)
	r.Get("/article", a.getArticle)
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
	r.Get("/macro/ipos", a.getIPOs)
	r.Get("/macro/recession-risk", a.getRecessionRisk)
	r.Get("/macro/froth", a.getFroth)
	r.Get("/macro/valuation", a.getValuation)
	r.Get("/heatmap", a.getHeatmap)
	r.Get("/heatmap/universes", a.getHeatmapUniverses)
	r.Get("/options", a.getOptions)
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

func (a *API) getCandles(w http.ResponseWriter, r *http.Request) {
	symbol := strings.TrimSpace(strings.ToUpper(r.URL.Query().Get("symbol")))
	if symbol == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("symbol is required"))
		return
	}
	rangeVal := r.URL.Query().Get("range")
	if rangeVal == "" {
		rangeVal = "1y"
	}
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "1d"
	}

	candles, err := client.GetCandles(symbol, rangeVal, interval)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	var result []CandleResponse
	for _, c := range candles {
		result = append(result, CandleResponse{
			Date:   c.Date,
			Open:   math.Round(c.Open*100) / 100,
			High:   math.Round(c.High*100) / 100,
			Low:    math.Round(c.Low*100) / 100,
			Close:  math.Round(c.Close*100) / 100,
			Volume: c.Volume,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getIndicators(w http.ResponseWriter, r *http.Request) {
	symbol := strings.TrimSpace(strings.ToUpper(r.URL.Query().Get("symbol")))
	if symbol == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("symbol is required"))
		return
	}
	rangeVal := r.URL.Query().Get("range")
	if rangeVal == "" {
		rangeVal = "1y"
	}
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "1d"
	}
	types := strings.Split(r.URL.Query().Get("types"), ",")

	candles, err := client.GetCandles(symbol, rangeVal, interval)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	var indicators []IndicatorSeries
	for _, t := range types {
		t = strings.TrimSpace(strings.ToLower(t))
		switch t {
		case "sma":
			periodStr := r.URL.Query().Get("sma_period")
			period, _ := strconv.Atoi(periodStr)
			if period <= 0 {
				period = 20
			}
			indicators = append(indicators, computeSMASeries(candles, period))
		case "ema":
			periodStr := r.URL.Query().Get("ema_period")
			period, _ := strconv.Atoi(periodStr)
			if period <= 0 {
				period = 20
			}
			indicators = append(indicators, computeEMASeries(candles, period))
		case "bollinger":
			periodStr := r.URL.Query().Get("bb_period")
			period, _ := strconv.Atoi(periodStr)
			if period <= 0 {
				period = 20
			}
			multStr := r.URL.Query().Get("bb_mult")
			mult, _ := strconv.ParseFloat(multStr, 64)
			if mult <= 0 {
				mult = 2.0
			}
			upper, mid, lower := computeBollingerSeries(candles, period, mult)
			indicators = append(indicators, upper, mid, lower)
		case "rsi":
			periodStr := r.URL.Query().Get("rsi_period")
			period, _ := strconv.Atoi(periodStr)
			if period <= 0 {
				period = 14
			}
			indicators = append(indicators, computeRSISeries(candles, period))
		case "macd":
			fastStr := r.URL.Query().Get("macd_fast")
			slowStr := r.URL.Query().Get("macd_slow")
			signalStr := r.URL.Query().Get("macd_signal")
			fast, _ := strconv.Atoi(fastStr)
			slow, _ := strconv.Atoi(slowStr)
			signal, _ := strconv.Atoi(signalStr)
			if fast <= 0 {
				fast = 12
			}
			if slow <= 0 {
				slow = 26
			}
			if signal <= 0 {
				signal = 9
			}
			macdLine, signalLine, hist := computeMACDSeries(candles, fast, slow, signal)
			indicators = append(indicators, macdLine, signalLine, hist)
		}
	}

	respondJSON(w, http.StatusOK, IndicatorsResponse{
		Symbol:     symbol,
		Indicators: indicators,
	})
}

func (a *API) postFormula(w http.ResponseWriter, r *http.Request) {
	var req FormulaRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}
	symbol := strings.TrimSpace(strings.ToUpper(req.Symbol))
	if symbol == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("symbol is required"))
		return
	}
	if req.Range == "" {
		req.Range = "1y"
	}
	if req.Interval == "" {
		req.Interval = "1d"
	}
	if strings.TrimSpace(req.Formula) == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("formula is required"))
		return
	}

	candles, err := client.GetCandles(symbol, req.Range, req.Interval)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	result, err := evaluateFormulaExpression(candles, req.Formula)
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	respondJSON(w, http.StatusOK, FormulaResponse{
		Symbol: symbol,
		Name:   req.Formula,
		Points: result,
	})
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

	articles, err := client.GetNews(symbols, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	var result []NewsItem
	for _, article := range articles {
		result = append(result, NewsItem{
			Title:     article.Title,
			Source:    article.Publisher,
			Published: time.Unix(article.ProviderPublishTime, 0).Format(time.RFC3339),
			URL:       article.Link,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

var (
	exchangeTickerRe   = regexp.MustCompile(`(?:NYSE|NASDAQ|AMEX|OTC)\s*:\s*([A-Z]{1,5})`)
	standaloneTickerRe = regexp.MustCompile(`\b[A-Z]{3,5}\b`)
	ldJSONRe           = regexp.MustCompile(`<script\s+type=["']application/ld\+json["'][^>]*>([\s\S]*?)</script>`)
	ogVideoRe          = regexp.MustCompile(`<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']`)
	isoDurationRe      = regexp.MustCompile(`PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?`)
)

var commonWords = map[string]bool{
	"THE": true, "AND": true, "FOR": true, "ARE": true, "BUT": true, "NOT": true,
	"YOU": true, "ALL": true, "ANY": true, "CAN": true, "HAD": true, "HER": true,
	"WAS": true, "ONE": true, "OUR": true, "OUT": true, "GET": true, "HAS": true,
	"HIM": true, "HIS": true, "HOW": true, "MAY": true, "NEW": true, "NOW": true,
	"OLD": true, "SEE": true, "TWO": true, "WAY": true, "WHO": true, "DID": true,
	"SHE": true, "USE": true, "TOO": true, "OWN": true, "SAY": true, "TRY": true,
	"LET": true, "PUT": true, "END": true, "WHY": true, "CEO": true, "CFO": true,
	"COO": true, "CTO": true, "USA": true, "EPS": true, "YTD": true, "RSI": true,
	"MACD": true, "SMA": true, "EMA": true, "IPO": true, "ETF": true, "USD": true,
	"HTML": true, "HTTP": true, "API": true, "URL": true, "CSS": true, "XML": true,
	"JSON": true, "SQL": true, "VPN": true, "CPU": true, "GPU": true, "RAM": true,
	"SSD": true, "USB": true, "PDF": true, "JPG": true, "PNG": true, "GIF": true,
	"DOC": true, "XLS": true, "PPT": true, "ZIP": true, "TXT": true, "CSV": true,
	"JAN": true, "FEB": true, "MAR": true, "APR": true, "JUN": true, "JUL": true,
	"AUG": true, "SEP": true, "OCT": true, "NOV": true, "DEC": true,
	"MON": true, "TUE": true, "WED": true, "THU": true, "FRI": true, "SAT": true, "SUN": true,
}

func extractTickers(text string) []string {
	seen := make(map[string]bool)
	var candidates []string

	for _, m := range exchangeTickerRe.FindAllStringSubmatch(text, -1) {
		sym := strings.ToUpper(m[1])
		if !seen[sym] {
			seen[sym] = true
			candidates = append(candidates, sym)
		}
	}

	for _, m := range standaloneTickerRe.FindAllString(text, -1) {
		sym := strings.ToUpper(m)
		if seen[sym] || commonWords[sym] {
			continue
		}
		seen[sym] = true
		candidates = append(candidates, sym)
	}

	return candidates
}

type VideoInfo struct {
	EmbedURL  string `json:"embed_url,omitempty"`
	StreamURL string `json:"stream_url,omitempty"`
	Thumbnail string `json:"thumbnail,omitempty"`
	Duration  int    `json:"duration,omitempty"`
}

func extractVideoInfo(html string) *VideoInfo {
	for _, m := range ldJSONRe.FindAllStringSubmatch(html, -1) {
		var ld interface{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(m[1])), &ld); err != nil {
			continue
		}
		vo := findVideoObject(ld)
		if vo == nil {
			continue
		}
		info := &VideoInfo{}
		if s, ok := vo["embedUrl"].(string); ok && s != "" {
			info.EmbedURL = s
		}
		if s, ok := vo["contentUrl"].(string); ok && s != "" {
			info.StreamURL = s
		}
		if s, ok := vo["thumbnailUrl"].(string); ok && s != "" {
			info.Thumbnail = s
		}
		if dur, ok := vo["duration"].(string); ok {
			info.Duration = parseISODuration(dur)
		}
		if id, ok := vo["identifier"].(string); ok && id != "" && info.StreamURL == "" {
			info.StreamURL = fmt.Sprintf("https://video.media.yql.yahoo.com/v1/video/sapi/hlsstreams/%s.m3u8", id)
		}
		if info.EmbedURL != "" || info.StreamURL != "" {
			return info
		}
	}

	if m := ogVideoRe.FindStringSubmatch(html); m != nil {
		return &VideoInfo{EmbedURL: m[1]}
	}

	return nil
}

func findVideoObject(obj interface{}) map[string]interface{} {
	switch v := obj.(type) {
	case map[string]interface{}:
		if t, ok := v["@type"].(string); ok && t == "VideoObject" {
			return v
		}
		for _, val := range v {
			if found := findVideoObject(val); found != nil {
				return found
			}
		}
	case []interface{}:
		for _, item := range v {
			if found := findVideoObject(item); found != nil {
				return found
			}
		}
	}
	return nil
}

func parseISODuration(s string) int {
	m := isoDurationRe.FindStringSubmatch(s)
	if m == nil {
		return 0
	}
	h, _ := strconv.Atoi(m[1])
	min, _ := strconv.Atoi(m[2])
	sec, _ := strconv.Atoi(m[3])
	return h*3600 + min*60 + sec
}

func (a *API) getArticle(w http.ResponseWriter, r *http.Request) {
	urlStr := r.URL.Query().Get("url")
	if urlStr == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("url is required"))
		return
	}

	parsed, err := url.ParseRequestURI(urlStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid url"))
		return
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid url scheme"))
		return
	}
	if parsed.Host == "" {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid url host"))
		return
	}

	// Fetch raw HTML ourselves so we can inspect it for video metadata
	httpCli := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("failed to create request: %w", err))
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	resp, err := httpCli.Do(req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("failed to fetch article: %w", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("HTTP %d from %s", resp.StatusCode, urlStr))
		return
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("failed to read response: %w", err))
		return
	}

	videoInfo := extractVideoInfo(string(bodyBytes))

	article, err := readability.FromReader(bytes.NewReader(bodyBytes), parsed)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Errorf("failed to parse article: %w", err))
		return
	}

	if article.Node == nil && videoInfo == nil {
		respondError(w, http.StatusUnprocessableEntity, fmt.Errorf("unable to extract article content from this page"))
		return
	}

	var htmlBuf bytes.Buffer
	if article.Node != nil {
		if err := article.RenderHTML(&htmlBuf); err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Errorf("failed to render article: %w", err))
			return
		}
	}

	var publishedTime string
	if pt, err := article.PublishedTime(); err == nil {
		publishedTime = pt.Format(time.RFC3339)
	}

	var textBuf bytes.Buffer
	if article.Node != nil {
		_ = article.RenderText(&textBuf)
	}
	candidates := extractTickers(textBuf.String())

	var tickerData []map[string]interface{}
	if len(candidates) > 0 {
		quotes, err := client.GetBatchQuotes(candidates)
		if err == nil {
			for _, q := range quotes {
				if q.Symbol == "" || q.Price == 0 {
					continue
				}
				tickerData = append(tickerData, map[string]interface{}{
					"symbol":         q.Symbol,
					"price":          math.Round(q.Price*100) / 100,
					"change":         math.Round(q.Change*100) / 100,
					"change_percent": math.Round(q.ChangePercent*100) / 100,
				})
			}
		}
	}

	result := map[string]interface{}{
		"title":          article.Title(),
		"byline":         article.Byline(),
		"excerpt":        article.Excerpt(),
		"site_name":      article.SiteName(),
		"published_time": publishedTime,
		"content":        htmlBuf.String(),
		"tickers":        tickerData,
	}
	if videoInfo != nil {
		result["video"] = videoInfo
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

func (a *API) getIPOs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 5
	}

	entries, err := client.GetUpcomingIPOs(limit)
	if err != nil {
		respondJSON(w, http.StatusOK, []IPOEntry{})
		return
	}

	var result []IPOEntry
	for _, e := range entries {
		result = append(result, IPOEntry{
			Symbol:     e.Symbol,
			Name:       e.Name,
			Date:       e.Date,
			Exchange:   e.Exchange,
			PriceRange: e.PriceRange,
			Shares:     e.Shares,
			DealSize:   e.DealSize,
			MarketCap:  e.MarketCap,
			Revenue:    e.Revenue,
			Status:     e.Status,
		})
	}
	respondJSON(w, http.StatusOK, result)
}

func (a *API) getRecessionRisk(w http.ResponseWriter, r *http.Request) {
	indicators := []RecessionIndicator{}
	riskScore := 0

	// 1. Yield Curve (10Y - 3M)
	if tnPoints, err := client.GetChart("^TNX", "3mo", "1d"); err == nil && len(tnPoints) > 0 {
		if irxPoints, err := client.GetChart("^IRX", "3mo", "1d"); err == nil && len(irxPoints) > 0 {
			current10y := tnPoints[len(tnPoints)-1].Price
			current3m := irxPoints[len(irxPoints)-1].Price
			spread := current10y - current3m
			var change1m float64
			if len(tnPoints) > 21 && len(irxPoints) > 21 {
				prev10y := tnPoints[len(tnPoints)-22].Price
				prev3m := irxPoints[len(irxPoints)-22].Price
				change1m = (spread - (prev10y - prev3m))
			}
			signal := "normal"
			desc := "Normal slope — no immediate recession risk"
			if spread < 0 {
				signal = "critical"
				desc = "Inverted yield curve — strong recession signal"
				riskScore += 25
			} else if spread < 0.5 {
				signal = "warning"
				desc = "Flattening curve — elevated recession risk"
				riskScore += 15
			}
			indicators = append(indicators, RecessionIndicator{
				Name:        "Yield Curve (10Y−3M)",
				Value:       math.Round(spread*100) / 100,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 2. Credit Spread (HYG vs LQD)
	if hyPoints, err := client.GetChart("HYG", "3mo", "1d"); err == nil && len(hyPoints) > 0 {
		if igPoints, err := client.GetChart("LQD", "3mo", "1d"); err == nil && len(igPoints) > 0 {
			hy := hyPoints[len(hyPoints)-1].Price
			ig := igPoints[len(igPoints)-1].Price
			spread := 0.0
			if ig > 0 {
				spread = (hy/ig - 1) * 100
			}
			var change1m float64
			if len(hyPoints) > 21 && len(igPoints) > 21 {
				hyPrev := hyPoints[len(hyPoints)-22].Price
				igPrev := igPoints[len(igPoints)-22].Price
				prevSpread := 0.0
				if igPrev > 0 {
					prevSpread = (hyPrev/igPrev - 1) * 100
				}
				change1m = spread - prevSpread
			}
			signal := "normal"
			desc := "Credit spreads tight — healthy credit market"
			if spread > 5 {
				signal = "critical"
				desc = "Spreads widening significantly — credit stress"
				riskScore += 25
			} else if spread > 3 {
				signal = "warning"
				desc = "Spreads elevated — rising credit risk"
				riskScore += 15
			}
			indicators = append(indicators, RecessionIndicator{
				Name:        "Credit Spread (HYG/LQD)",
				Value:       math.Round(spread*100) / 100,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 3. Copper/Gold Ratio
	if cperPoints, err := client.GetChart("CPER", "3mo", "1d"); err == nil && len(cperPoints) > 0 {
		if gldPoints, err := client.GetChart("GLD", "3mo", "1d"); err == nil && len(gldPoints) > 0 {
			current := 0.0
			if gldPoints[len(gldPoints)-1].Price > 0 {
				current = cperPoints[len(cperPoints)-1].Price / gldPoints[len(gldPoints)-1].Price
			}
			var change1m float64
			if len(cperPoints) > 21 && len(gldPoints) > 21 {
				prev := 0.0
				if gldPoints[len(gldPoints)-22].Price > 0 {
					prev = cperPoints[len(cperPoints)-22].Price / gldPoints[len(gldPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "normal"
			desc := "Copper/gold stable — neutral growth outlook"
			if change1m < -8 {
				signal = "critical"
				desc = "Copper/gold falling sharply — weakening growth"
				riskScore += 20
			} else if change1m < -3 {
				signal = "warning"
				desc = "Copper/gold declining — growth concerns"
				riskScore += 10
			}
			indicators = append(indicators, RecessionIndicator{
				Name:        "Copper / Gold",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 4. Discretionary / Staples
	if xlyPoints, err := client.GetChart("XLY", "3mo", "1d"); err == nil && len(xlyPoints) > 0 {
		if xlpPoints, err := client.GetChart("XLP", "3mo", "1d"); err == nil && len(xlpPoints) > 0 {
			current := 0.0
			if xlpPoints[len(xlpPoints)-1].Price > 0 {
				current = xlyPoints[len(xlyPoints)-1].Price / xlpPoints[len(xlpPoints)-1].Price
			}
			var change1m float64
			if len(xlyPoints) > 21 && len(xlpPoints) > 21 {
				prev := 0.0
				if xlpPoints[len(xlpPoints)-22].Price > 0 {
					prev = xlyPoints[len(xlyPoints)-22].Price / xlpPoints[len(xlpPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "normal"
			desc := "Cyclicals performing — healthy risk appetite"
			if change1m < -5 {
				signal = "critical"
				desc = "Defensives outperforming — risk-off regime"
				riskScore += 15
			} else if change1m < -2 {
				signal = "warning"
				desc = "Cyclicals weakening — caution warranted"
				riskScore += 8
			}
			indicators = append(indicators, RecessionIndicator{
				Name:        "Discretionary / Staples",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 5. Small Cap / Large Cap
	if iwmPoints, err := client.GetChart("IWM", "3mo", "1d"); err == nil && len(iwmPoints) > 0 {
		if spyPoints, err := client.GetChart("SPY", "3mo", "1d"); err == nil && len(spyPoints) > 0 {
			current := 0.0
			if spyPoints[len(spyPoints)-1].Price > 0 {
				current = iwmPoints[len(iwmPoints)-1].Price / spyPoints[len(spyPoints)-1].Price
			}
			var change1m float64
			if len(iwmPoints) > 21 && len(spyPoints) > 21 {
				prev := 0.0
				if spyPoints[len(spyPoints)-22].Price > 0 {
					prev = iwmPoints[len(iwmPoints)-22].Price / spyPoints[len(spyPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "normal"
			desc := "Small caps keeping pace — broad participation"
			if change1m < -5 {
				signal = "critical"
				desc = "Small caps lagging badly — flight to safety"
				riskScore += 15
			} else if change1m < -2 {
				signal = "warning"
				desc = "Small caps underperforming — narrowing breadth"
				riskScore += 8
			}
			indicators = append(indicators, RecessionIndicator{
				Name:        "Small Cap / Large Cap",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	if riskScore > 100 {
		riskScore = 100
	}
	riskLabel := "Low"
	if riskScore >= 75 {
		riskLabel = "High"
	} else if riskScore >= 50 {
		riskLabel = "Elevated"
	} else if riskScore >= 25 {
		riskLabel = "Moderate"
	}

	respondJSON(w, http.StatusOK, RecessionRiskData{
		Indicators: indicators,
		RiskScore:  riskScore,
		RiskLabel:  riskLabel,
	})
}

func (a *API) getFroth(w http.ResponseWriter, r *http.Request) {
	indicators := []FrothIndicator{}
	frothScore := 0

	// 1. Speculative Appetite (ARKK / SPY)
	if arkkPoints, err := client.GetChart("ARKK", "3mo", "1d"); err == nil && len(arkkPoints) > 0 {
		if spyPoints, err := client.GetChart("SPY", "3mo", "1d"); err == nil && len(spyPoints) > 0 {
			current := 0.0
			if spyPoints[len(spyPoints)-1].Price > 0 {
				current = arkkPoints[len(arkkPoints)-1].Price / spyPoints[len(spyPoints)-1].Price
			}
			var change1m float64
			if len(arkkPoints) > 21 && len(spyPoints) > 21 {
				prev := 0.0
				if spyPoints[len(spyPoints)-22].Price > 0 {
					prev = arkkPoints[len(arkkPoints)-22].Price / spyPoints[len(spyPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "low"
			desc := "Speculative appetite muted"
			if change1m > 15 {
				signal = "extreme"
				desc = "ARKK surging vs S&P — speculative mania"
				frothScore += 25
			} else if change1m > 8 {
				signal = "high"
				desc = "Speculative stocks outperforming"
				frothScore += 15
			} else if change1m > 3 {
				signal = "moderate"
				desc = "Some speculative interest"
				frothScore += 5
			}
			indicators = append(indicators, FrothIndicator{
				Name:        "ARKK / S&P 500",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 2. Crypto Proxy (MSTR)
	if mstrPoints, err := client.GetChart("MSTR", "3mo", "1d"); err == nil && len(mstrPoints) > 0 {
		current := mstrPoints[len(mstrPoints)-1].Price
		var change1m float64
		if len(mstrPoints) > 21 {
			prev := mstrPoints[len(mstrPoints)-22].Price
			if prev > 0 {
				change1m = ((current - prev) / prev) * 100
			}
		}
		signal := "low"
		desc := "Crypto proxy stable"
		if change1m > 40 {
			signal = "extreme"
			desc = "MSTR exploding — crypto mania"
			frothScore += 20
		} else if change1m > 20 {
			signal = "high"
			desc = "Crypto proxy running hot"
			frothScore += 12
		} else if change1m > 8 {
			signal = "moderate"
			desc = "Crypto proxy warming up"
			frothScore += 5
		}
		indicators = append(indicators, FrothIndicator{
			Name:        "MSTR (Crypto Proxy)",
			Value:       math.Round(current*100) / 100,
			Change1m:    math.Round(change1m*100) / 100,
			Signal:      signal,
			Description: desc,
		})
	}

	// 3. Tech Concentration (QQQ / SPY)
	if qqqPoints, err := client.GetChart("QQQ", "3mo", "1d"); err == nil && len(qqqPoints) > 0 {
		if spyPoints, err := client.GetChart("SPY", "3mo", "1d"); err == nil && len(spyPoints) > 0 {
			current := 0.0
			if spyPoints[len(spyPoints)-1].Price > 0 {
				current = qqqPoints[len(qqqPoints)-1].Price / spyPoints[len(spyPoints)-1].Price
			}
			var change1m float64
			if len(qqqPoints) > 21 && len(spyPoints) > 21 {
				prev := 0.0
				if spyPoints[len(spyPoints)-22].Price > 0 {
					prev = qqqPoints[len(qqqPoints)-22].Price / spyPoints[len(spyPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "low"
			desc := "Tech concentration normal"
			if change1m > 10 {
				signal = "extreme"
				desc = "Tech surging vs broad market — narrow rally"
				frothScore += 20
			} else if change1m > 5 {
				signal = "high"
				desc = "Tech outperforming — narrowing breadth"
				frothScore += 12
			} else if change1m > 2 {
				signal = "moderate"
				desc = "Tech leading modestly"
				frothScore += 5
			}
			indicators = append(indicators, FrothIndicator{
				Name:        "Nasdaq 100 / S&P 500",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	// 4. VIX (inverse froth indicator)
	if vixPoints, err := client.GetChart("^VIX", "3mo", "1d"); err == nil && len(vixPoints) > 0 {
		current := vixPoints[len(vixPoints)-1].Price
		var change1m float64
		if len(vixPoints) > 21 {
			prev := vixPoints[len(vixPoints)-22].Price
			change1m = current - prev
		}
		signal := "low"
		desc := "VIX elevated — fear present"
		if current < 12 {
			signal = "extreme"
			desc = "VIX extremely low — complacency"
			frothScore += 20
		} else if current < 15 {
			signal = "high"
			desc = "VIX low — elevated complacency"
			frothScore += 12
		} else if current < 20 {
			signal = "moderate"
			desc = "VIX moderate"
			frothScore += 5
		}
		indicators = append(indicators, FrothIndicator{
			Name:        "VIX",
			Value:       math.Round(current*100) / 100,
			Change1m:    math.Round(change1m*100) / 100,
			Signal:      signal,
			Description: desc,
		})
	}

	// 5. Retail Favorites (XLY / SPY)
	if xlyPoints, err := client.GetChart("XLY", "3mo", "1d"); err == nil && len(xlyPoints) > 0 {
		if spyPoints, err := client.GetChart("SPY", "3mo", "1d"); err == nil && len(spyPoints) > 0 {
			current := 0.0
			if spyPoints[len(spyPoints)-1].Price > 0 {
				current = xlyPoints[len(xlyPoints)-1].Price / spyPoints[len(spyPoints)-1].Price
			}
			var change1m float64
			if len(xlyPoints) > 21 && len(spyPoints) > 21 {
				prev := 0.0
				if spyPoints[len(spyPoints)-22].Price > 0 {
					prev = xlyPoints[len(xlyPoints)-22].Price / spyPoints[len(spyPoints)-22].Price
				}
				if prev > 0 {
					change1m = ((current - prev) / prev) * 100
				}
			}
			signal := "low"
			desc := "Consumer discretionary muted"
			if change1m > 10 {
				signal = "extreme"
				desc = "Discretionary surging — retail euphoria"
				frothScore += 15
			} else if change1m > 5 {
				signal = "high"
				desc = "Retail participation high"
				frothScore += 8
			} else if change1m > 2 {
				signal = "moderate"
				desc = "Retail interest picking up"
				frothScore += 3
			}
			indicators = append(indicators, FrothIndicator{
				Name:        "Consumer Disc. / S&P 500",
				Value:       math.Round(current*1000) / 1000,
				Change1m:    math.Round(change1m*100) / 100,
				Signal:      signal,
				Description: desc,
			})
		}
	}

	if frothScore > 100 {
		frothScore = 100
	}
	frothLabel := "Low"
	if frothScore >= 75 {
		frothLabel = "Extreme"
	} else if frothScore >= 50 {
		frothLabel = "High"
	} else if frothScore >= 25 {
		frothLabel = "Moderate"
	}

	respondJSON(w, http.StatusOK, FrothData{
		Indicators: indicators,
		FrothScore: frothScore,
		FrothLabel: frothLabel,
	})
}

func (a *API) getValuation(w http.ResponseWriter, r *http.Request) {
	points, err := client.GetChart("^GSPC", "5y", "1d")
	if err != nil {
		points, err = client.GetChart("SPY", "5y", "1d")
		if err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
	}

	var history []ValuationPoint
	var current, ma200 float64
	for i, p := range points {
		vp := ValuationPoint{Date: p.Date, Price: math.Round(p.Price*100) / 100}
		if i >= 199 {
			ma := sma(points[i-199 : i+1])
			vp.Ma200 = math.Round(ma*100) / 100
			if i == len(points)-1 {
				current = vp.Price
				ma200 = vp.Ma200
			}
		}
		history = append(history, vp)
	}

	premium := 0.0
	if ma200 > 0 {
		premium = ((current - ma200) / ma200) * 100
	}

	// Try to get forward PE for SPY
	forwardPE := 0.0
	if m, err := client.GetQuoteSummary("SPY"); err == nil {
		forwardPE = m.PeForward
		if forwardPE == 0 {
			forwardPE = m.PeTrailing
		}
		forwardPE = math.Round(forwardPE*10) / 10
	}

	respondJSON(w, http.StatusOK, ValuationData{
		Current:   math.Round(current*100) / 100,
		Ma200:     math.Round(ma200*100) / 100,
		Premium:   math.Round(premium*100) / 100,
		History:   history,
		ForwardPE: forwardPE,
	})
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

func (a *API) getOptions(w http.ResponseWriter, r *http.Request) {
	symbols := parseSymbols(r.URL.Query().Get("symbols"))
	if len(symbols) == 0 {
		symbols = []string{"AAPL"}
	}

	var result []OptionsData
	for _, sym := range symbols {
		summary, err := client.GetOptionsChain(sym)
		if err != nil {
			continue
		}
		result = append(result, OptionsData{
			Symbol:             summary.Symbol,
			CallVolume:         summary.CallVolume,
			PutVolume:          summary.PutVolume,
			CallOI:             summary.CallOI,
			PutOI:              summary.PutOI,
			PutCallVolumeRatio: math.Round(summary.PutCallVolumeRatio*100) / 100,
			PutCallOIRatio:     math.Round(summary.PutCallOIRatio*100) / 100,
		})
	}
	respondJSON(w, http.StatusOK, result)
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

// ---------- Technical Indicator Helpers ----------

func computeSMASeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var sum float64
		for j := i - period + 1; j <= i; j++ {
			sum += candles[j].Close
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(sum/float64(period)*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("SMA(%d)", period), Points: points}
}

func computeEMASeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	if len(candles) < period {
		return IndicatorSeries{Name: fmt.Sprintf("EMA(%d)", period), Points: points}
	}
	// Seed EMA with SMA
	var sum float64
	for i := 0; i < period; i++ {
		sum += candles[i].Close
	}
	ema := sum / float64(period)
	multiplier := 2.0 / (float64(period) + 1)

	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		if i == period-1 {
			ema = sum / float64(period)
		} else {
			ema = (candles[i].Close-ema)*multiplier + ema
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(ema*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("EMA(%d)", period), Points: points}
}

func computeBollingerSeries(candles []client.Candle, period int, mult float64) (upper, mid, lower IndicatorSeries) {
	upper.Name = fmt.Sprintf("BB Upper(%d,%.1f)", period, mult)
	mid.Name = fmt.Sprintf("BB Middle(%d)", period)
	lower.Name = fmt.Sprintf("BB Lower(%d,%.1f)", period, mult)

	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var sum float64
		for j := i - period + 1; j <= i; j++ {
			sum += candles[j].Close
		}
		sma := sum / float64(period)
		var variance float64
		for j := i - period + 1; j <= i; j++ {
			variance += math.Pow(candles[j].Close-sma, 2)
		}
		stddev := math.Sqrt(variance / float64(period))
		mid.Points = append(mid.Points, IndicatorPoint{Date: candles[i].Date, Value: math.Round(sma*100) / 100})
		upper.Points = append(upper.Points, IndicatorPoint{Date: candles[i].Date, Value: math.Round((sma+mult*stddev)*100) / 100})
		lower.Points = append(lower.Points, IndicatorPoint{Date: candles[i].Date, Value: math.Round((sma-mult*stddev)*100) / 100})
	}
	return
}

func computeRSISeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	if len(candles) < period+1 {
		return IndicatorSeries{Name: fmt.Sprintf("RSI(%d)", period), Points: points}
	}
	var gains, losses float64
	for i := 1; i <= period; i++ {
		change := candles[i].Close - candles[i-1].Close
		if change > 0 {
			gains += change
		} else {
			losses += -change
		}
	}
	avgGain := gains / float64(period)
	avgLoss := losses / float64(period)

	for i := period; i < len(candles); i++ {
		change := candles[i].Close - candles[i-1].Close
		var gain, loss float64
		if change > 0 {
			gain = change
		} else {
			loss = -change
		}
		avgGain = (avgGain*float64(period-1) + gain) / float64(period)
		avgLoss = (avgLoss*float64(period-1) + loss) / float64(period)

		var rsi float64
		if avgLoss == 0 {
			rsi = 100
		} else {
			rs := avgGain / avgLoss
			rsi = 100 - (100 / (1 + rs))
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(clamp(rsi, 0, 100)*10) / 10,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("RSI(%d)", period), Points: points}
}

func computeMACDSeries(candles []client.Candle, fast, slow, signal int) (macdLine, signalLine, hist IndicatorSeries) {
	macdLine.Name = fmt.Sprintf("MACD(%d,%d)", fast, slow)
	signalLine.Name = fmt.Sprintf("MACD Signal(%d)", signal)
	hist.Name = "MACD Histogram"

	if len(candles) < slow {
		return
	}

	fastEMA := computeEMAValues(candles, fast)
	slowEMA := computeEMAValues(candles, slow)

	var macdValues []float64
	for i := 0; i < len(candles); i++ {
		if fastEMA[i] == 0 || slowEMA[i] == 0 {
			macdValues = append(macdValues, 0)
			continue
		}
		macdValues = append(macdValues, fastEMA[i]-slowEMA[i])
	}

	// Signal line = EMA of MACD
	signalEMA := emaOfSlice(macdValues, signal)

	for i := 0; i < len(candles); i++ {
		if macdValues[i] == 0 || signalEMA[i] == 0 {
			continue
		}
		macdLine.Points = append(macdLine.Points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(macdValues[i]*100) / 100,
		})
		signalLine.Points = append(signalLine.Points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(signalEMA[i]*100) / 100,
		})
		hist.Points = append(hist.Points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round((macdValues[i]-signalEMA[i])*100) / 100,
		})
	}
	return
}

func computeEMAValues(candles []client.Candle, period int) []float64 {
	result := make([]float64, len(candles))
	if len(candles) < period {
		return result
	}
	var sum float64
	for i := 0; i < period; i++ {
		sum += candles[i].Close
	}
	multiplier := 2.0 / (float64(period) + 1)
	ema := sum / float64(period)
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		if i == period-1 {
			ema = sum / float64(period)
		} else {
			ema = (candles[i].Close-ema)*multiplier + ema
		}
		result[i] = ema
	}
	return result
}

func emaOfSlice(values []float64, period int) []float64 {
	result := make([]float64, len(values))
	if len(values) < period {
		return result
	}
	var sum float64
	count := 0
	for i := 0; i < len(values); i++ {
		if values[i] != 0 {
			sum += values[i]
			count++
		}
		if count == period {
			break
		}
	}
	multiplier := 2.0 / (float64(period) + 1)
	ema := sum / float64(period)
	started := false
	for i := 0; i < len(values); i++ {
		if !started {
			if values[i] != 0 {
				if count > 0 {
					count--
					if count == 0 {
						started = true
						ema = sum / float64(period)
						result[i] = ema
					}
				}
			}
			continue
		}
		if values[i] == 0 {
			result[i] = ema
			continue
		}
		ema = (values[i]-ema)*multiplier + ema
		result[i] = ema
	}
	return result
}

func computeWMASeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var sum, weightSum float64
		for j := i - period + 1; j <= i; j++ {
			weight := float64(j - (i - period + 1) + 1)
			sum += candles[j].Close * weight
			weightSum += weight
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(sum/weightSum*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("WMA(%d)", period), Points: points}
}

func computeHMASeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	halfPeriod := period / 2
	sqrtPeriod := int(math.Sqrt(float64(period)))

	// WMA of close over half period
	wmaHalf := make([]float64, len(candles))
	for i := 0; i < len(candles); i++ {
		if i < halfPeriod-1 {
			continue
		}
		var sum, weightSum float64
		for j := i - halfPeriod + 1; j <= i; j++ {
			weight := float64(j - (i - halfPeriod + 1) + 1)
			sum += candles[j].Close * weight
			weightSum += weight
		}
		wmaHalf[i] = sum / weightSum
	}

	// WMA of close over full period
	wmaFull := make([]float64, len(candles))
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var sum, weightSum float64
		for j := i - period + 1; j <= i; j++ {
			weight := float64(j - (i - period + 1) + 1)
			sum += candles[j].Close * weight
			weightSum += weight
		}
		wmaFull[i] = sum / weightSum
	}

	// Raw HMA = 2*WMA(half) - WMA(full)
	raw := make([]float64, len(candles))
	for i := 0; i < len(candles); i++ {
		raw[i] = 2*wmaHalf[i] - wmaFull[i]
	}

	// WMA of raw over sqrt(period)
	for i := 0; i < len(candles); i++ {
		if i < sqrtPeriod-1 || raw[i] == 0 {
			continue
		}
		var sum, weightSum float64
		for j := i - sqrtPeriod + 1; j <= i; j++ {
			if raw[j] == 0 {
				continue
			}
			weight := float64(j - (i - sqrtPeriod + 1) + 1)
			sum += raw[j] * weight
			weightSum += weight
		}
		if weightSum > 0 {
			points = append(points, IndicatorPoint{
				Date:  candles[i].Date,
				Value: math.Round(sum/weightSum*100) / 100,
			})
		}
	}
	return IndicatorSeries{Name: fmt.Sprintf("HMA(%d)", period), Points: points}
}

func computeVWMASeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var pvSum, volSum float64
		for j := i - period + 1; j <= i; j++ {
			typical := (candles[j].High + candles[j].Low + candles[j].Close) / 3
			pvSum += typical * float64(candles[j].Volume)
			volSum += float64(candles[j].Volume)
		}
		if volSum > 0 {
			points = append(points, IndicatorPoint{
				Date:  candles[i].Date,
				Value: math.Round(pvSum/volSum*100) / 100,
			})
		}
	}
	return IndicatorSeries{Name: fmt.Sprintf("VWMA(%d)", period), Points: points}
}

func computeTRSeries(candles []client.Candle) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		tr := candles[i].High - candles[i].Low
		if i > 0 {
			tr2 := math.Abs(candles[i].High - candles[i-1].Close)
			tr3 := math.Abs(candles[i].Low - candles[i-1].Close)
			tr = math.Max(tr, math.Max(tr2, tr3))
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(tr*100) / 100,
		})
	}
	return IndicatorSeries{Name: "TR", Points: points}
}

func computeATRSeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	if len(candles) < period {
		return IndicatorSeries{Name: fmt.Sprintf("ATR(%d)", period), Points: points}
	}
	trValues := make([]float64, len(candles))
	for i := 0; i < len(candles); i++ {
		trValues[i] = candles[i].High - candles[i].Low
		if i > 0 {
			tr2 := math.Abs(candles[i].High - candles[i-1].Close)
			tr3 := math.Abs(candles[i].Low - candles[i-1].Close)
			trValues[i] = math.Max(trValues[i], math.Max(tr2, tr3))
		}
	}
	var atr float64
	for i := 0; i < period; i++ {
		atr += trValues[i]
	}
	atr /= float64(period)
	points = append(points, IndicatorPoint{
		Date:  candles[period-1].Date,
		Value: math.Round(atr*100) / 100,
	})
	for i := period; i < len(candles); i++ {
		atr = (atr*float64(period-1) + trValues[i]) / float64(period)
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(atr*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("ATR(%d)", period), Points: points}
}

func computeStdDevSeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var sum float64
		for j := i - period + 1; j <= i; j++ {
			sum += candles[j].Close
		}
		mean := sum / float64(period)
		var variance float64
		for j := i - period + 1; j <= i; j++ {
			variance += math.Pow(candles[j].Close-mean, 2)
		}
		stddev := math.Sqrt(variance / float64(period))
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(stddev*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("StdDev(%d)", period), Points: points}
}

func computeCCISeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		var tpSum float64
		for j := i - period + 1; j <= i; j++ {
			tpSum += (candles[j].High + candles[j].Low + candles[j].Close) / 3
		}
		meanTP := tpSum / float64(period)
		var meanDev float64
		for j := i - period + 1; j <= i; j++ {
			meanDev += math.Abs((candles[j].High+candles[j].Low+candles[j].Close)/3 - meanTP)
		}
		meanDev /= float64(period)
		currentTP := (candles[i].High + candles[i].Low + candles[i].Close) / 3
		var cci float64
		if meanDev != 0 {
			cci = (currentTP - meanTP) / (0.015 * meanDev)
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(cci*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("CCI(%d)", period), Points: points}
}

func computeStochKSeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		lowestLow := candles[i].Low
		highestHigh := candles[i].High
		for j := i - period + 1; j <= i; j++ {
			if candles[j].Low < lowestLow {
				lowestLow = candles[j].Low
			}
			if candles[j].High > highestHigh {
				highestHigh = candles[j].High
			}
		}
		var k float64
		range_ := highestHigh - lowestLow
		if range_ != 0 {
			k = (candles[i].Close - lowestLow) / range_ * 100
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(k*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("StochK(%d)", period), Points: points}
}

func computeStochDSeries(candles []client.Candle, period int, smoothK int) IndicatorSeries {
	kValues := make([]float64, len(candles))
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		lowestLow := candles[i].Low
		highestHigh := candles[i].High
		for j := i - period + 1; j <= i; j++ {
			if candles[j].Low < lowestLow {
				lowestLow = candles[j].Low
			}
			if candles[j].High > highestHigh {
				highestHigh = candles[j].High
			}
		}
		range_ := highestHigh - lowestLow
		if range_ != 0 {
			kValues[i] = (candles[i].Close - lowestLow) / range_ * 100
		}
	}
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period+smoothK-2 || kValues[i] == 0 {
			continue
		}
		var sum float64
		count := 0
		for j := i - smoothK + 1; j <= i; j++ {
			if kValues[j] != 0 {
				sum += kValues[j]
				count++
			}
		}
		if count > 0 {
			points = append(points, IndicatorPoint{
				Date:  candles[i].Date,
				Value: math.Round(sum/float64(count)*100) / 100,
			})
		}
	}
	return IndicatorSeries{Name: fmt.Sprintf("StochD(%d,%d)", period, smoothK), Points: points}
}

func computeWilliamsRSeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	for i := 0; i < len(candles); i++ {
		if i < period-1 {
			continue
		}
		lowestLow := candles[i].Low
		highestHigh := candles[i].High
		for j := i - period + 1; j <= i; j++ {
			if candles[j].Low < lowestLow {
				lowestLow = candles[j].Low
			}
			if candles[j].High > highestHigh {
				highestHigh = candles[j].High
			}
		}
		var wr float64
		range_ := highestHigh - lowestLow
		if range_ != 0 {
			wr = (highestHigh - candles[i].Close) / range_ * -100
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(wr*100) / 100,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("WilliamsR(%d)", period), Points: points}
}

func computeMFISeries(candles []client.Candle, period int) IndicatorSeries {
	var points []IndicatorPoint
	if len(candles) < period+1 {
		return IndicatorSeries{Name: fmt.Sprintf("MFI(%d)", period), Points: points}
	}
	var positiveFlow, negativeFlow float64
	for i := 1; i <= period; i++ {
		tp0 := (candles[i-1].High + candles[i-1].Low + candles[i-1].Close) / 3
		tp1 := (candles[i].High + candles[i].Low + candles[i].Close) / 3
		rawMF := tp1 * float64(candles[i].Volume)
		if tp1 > tp0 {
			positiveFlow += rawMF
		} else {
			negativeFlow += rawMF
		}
	}
	for i := period; i < len(candles); i++ {
		tp0 := (candles[i-1].High + candles[i-1].Low + candles[i-1].Close) / 3
		tp1 := (candles[i].High + candles[i].Low + candles[i].Close) / 3
		rawMF := tp1 * float64(candles[i].Volume)
		if tp1 > tp0 {
			positiveFlow = (positiveFlow*float64(period-1) + rawMF) / float64(period)
			negativeFlow = (negativeFlow * float64(period-1)) / float64(period)
		} else {
			positiveFlow = (positiveFlow * float64(period-1)) / float64(period)
			negativeFlow = (negativeFlow*float64(period-1) + rawMF) / float64(period)
		}
		var mfi float64
		if negativeFlow != 0 {
			mr := positiveFlow / negativeFlow
			mfi = 100 - (100 / (1 + mr))
		} else {
			mfi = 100
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(clamp(mfi, 0, 100)*10) / 10,
		})
	}
	return IndicatorSeries{Name: fmt.Sprintf("MFI(%d)", period), Points: points}
}

func computeOBVSeries(candles []client.Candle) IndicatorSeries {
	var points []IndicatorPoint
	var obv float64
	for i := 0; i < len(candles); i++ {
		if i > 0 {
			if candles[i].Close > candles[i-1].Close {
				obv += float64(candles[i].Volume)
			} else if candles[i].Close < candles[i-1].Close {
				obv -= float64(candles[i].Volume)
			}
		}
		points = append(points, IndicatorPoint{
			Date:  candles[i].Date,
			Value: math.Round(obv*100) / 100,
		})
	}
	return IndicatorSeries{Name: "OBV", Points: points}
}


