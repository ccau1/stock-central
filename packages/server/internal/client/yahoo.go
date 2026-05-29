package client

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"
)

var jar, _ = cookiejar.New(nil)

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Jar:     jar,
}

var yahooCrumb string
var yahooCrumbAt time.Time

// ensureYahooSession ensures we have a valid Yahoo session (cookie + crumb).
// Yahoo Finance APIs now require both a consent cookie and a crumb token.
func ensureYahooSession() error {
	// Cookie is good for ~1 year; crumb is good for a session
	if yahooCrumb != "" && time.Since(yahooCrumbAt) < 5*time.Minute {
		return nil
	}

	// Step 1: get cookie from fc.yahoo.com
	req1, _ := http.NewRequest("GET", "https://fc.yahoo.com", nil)
	req1.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	resp1, err := httpClient.Do(req1)
	if err != nil {
		return err
	}
	resp1.Body.Close()

	// Step 2: get crumb
	req2, _ := http.NewRequest("GET", "https://query1.finance.yahoo.com/v1/test/getcrumb", nil)
	req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	resp2, err := httpClient.Do(req2)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()
	body, _ := io.ReadAll(resp2.Body)
	yahooCrumb = strings.TrimSpace(string(body))
	yahooCrumbAt = time.Now()
	return nil
}

// ---------- Search ----------

type TickerResult struct {
	Symbol    string `json:"symbol"`
	ShortName string `json:"shortname"`
	LongName  string `json:"longname"`
	Exchange  string `json:"exchange"`
	QuoteType string `json:"quoteType"`
}

func SearchTickers(query string) ([]TickerResult, error) {
	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v1/finance/search?q=%s&quotesCount=20&newsCount=0&enableFuzzyQuery=false",
		url.QueryEscape(query),
	)
	body, err := yahooFetch(u)
	if err != nil {
		// Retry once after refreshing the session
		if err := ensureYahooSession(); err == nil {
			body, err = yahooFetch(u)
		}
		if err != nil {
			return nil, err
		}
	}

	var resp struct {
		Quotes []TickerResult `json:"quotes"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	var results []TickerResult
	for _, q := range resp.Quotes {
		if q.QuoteType == "EQUITY" && q.Symbol != "" {
			results = append(results, q)
		}
	}
	return results, nil
}

// ---------- Chart (Price History) ----------

type ChartPoint struct {
	Date  string  `json:"date"`
	Price float64 `json:"price"`
}

func GetChart(symbol, rangeVal, interval string) ([]ChartPoint, error) {
	if interval == "" {
		interval = mapRangeToInterval(rangeVal)
	}
	yahooRange := ToYahooRange(rangeVal)
	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=%s",
		url.QueryEscape(symbol),
		url.QueryEscape(yahooRange),
		url.QueryEscape(interval),
	)
	body, err := yahooFetch(u)
	if err != nil {
		// Retry once after ensuring session if it looks like an auth issue
		if err := ensureYahooSession(); err == nil {
			body, err = yahooFetch(u)
		}
		if err != nil {
			return nil, err
		}
	}

	var resp struct {
		Chart struct {
			Result []struct {
				Timestamp []int64 `json:"timestamp"`
				Indicators  struct {
					Quote []struct {
						Close []float64 `json:"close"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
			Error *struct {
				Description string `json:"description"`
			} `json:"error"`
		} `json:"chart"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if resp.Chart.Error != nil {
		return nil, fmt.Errorf("yahoo chart error: %s", resp.Chart.Error.Description)
	}
	if len(resp.Chart.Result) == 0 {
		return nil, fmt.Errorf("no chart data for %s", symbol)
	}

	r := resp.Chart.Result[0]
	timestamps := r.Timestamp
	if len(r.Indicators.Quote) == 0 || len(r.Indicators.Quote[0].Close) == 0 {
		return nil, fmt.Errorf("no price data for %s", symbol)
	}
	closes := r.Indicators.Quote[0].Close

	var points []ChartPoint
	for i, ts := range timestamps {
		if i < len(closes) {
			points = append(points, ChartPoint{
				Date:  time.Unix(ts, 0).Format("2006-01-02"),
				Price: closes[i],
			})
		}
	}
	return points, nil
}

func mapRangeToInterval(rangeVal string) string {
	switch rangeVal {
	case "1d":
		return "30m"
	case "1w":
		return "1h"
	case "1m", "3m", "6m", "1y", "ytd":
		return "1d"
	case "yoy", "5y":
		return "1wk"
	default:
		return "1d"
	}
}

// ToYahooRange converts our shorthand ranges to Yahoo Finance compatible values.
func ToYahooRange(rangeVal string) string {
	switch rangeVal {
	case "1d":
		return "1d"
	case "1w":
		return "5d"
	case "1m":
		return "1mo"
	case "3m":
		return "3mo"
	case "6m":
		return "6mo"
	case "1y":
		return "1y"
	case "ytd":
		return "ytd"
	case "yoy":
		return "2y"
	case "5y":
		return "5y"
	default:
		return "1y"
	}
}

// ---------- Quote Summary (Metrics) ----------

type QuarterlyEarning struct {
	Date     string  `json:"date"`
	Actual   float64 `json:"actual"`
	Estimate float64 `json:"estimate"`
	BeatPct  float64 `json:"beat_pct"` // (actual - estimate) / |estimate| * 100
}

type QuoteMetrics struct {
	Symbol           string  `json:"symbol"`
	Price            float64 `json:"price"`
	PeTrailing       float64 `json:"pe_trailing"`
	PeForward        float64 `json:"pe_forward"`         // current fiscal year (0y)
	PeForwardNextFY  float64 `json:"pe_forward_next_fy"` // next fiscal year (+1y)
	MarketCap        float64 `json:"market_cap"`
	DivYield         float64 `json:"dividend_yield"`
	Volume           int64   `json:"volume"`
	EpsTrailing      float64 `json:"eps_trailing"`
	EpsForward       float64 `json:"eps_forward"`         // current fiscal year (0y)
	EpsForwardNextFY float64 `json:"eps_forward_next_fy"` // next fiscal year (+1y)
	// Guidance / estimate fields
	EpsGrowth         float64 `json:"eps_growth"`          // current FY earnings growth estimate
	RevenueGrowth     float64 `json:"revenue_growth"`      // current FY revenue growth estimate
	EpsRevision30d    float64 `json:"eps_revision_30d"`    // current estimate minus 30 days ago
	NumAnalysts       int     `json:"num_analysts"`        // number of analysts covering
	// Quarterly earnings actual vs estimate
	EpsActualQ     float64 `json:"eps_actual_q"`     // most recent quarter actual EPS
	EpsEstimateQ   float64 `json:"eps_estimate_q"`   // most recent quarter estimated EPS
	QuarterLabel   string  `json:"quarter_label"`    // e.g. "Q3 2024"
	EarningsHistory []QuarterlyEarning `json:"earnings_history"`
	// Next earnings report
	NextEarningsDate int64  `json:"next_earnings_date"` // Unix timestamp of next earnings
	NextEarningsTime string `json:"next_earnings_time"` // "Pre-market", "After-hours", or ""
}

func GetQuoteSummary(symbol string) (*QuoteMetrics, error) {
	if err := ensureYahooSession(); err != nil {
		return nil, err
	}

	u := fmt.Sprintf(
		"https://query2.finance.yahoo.com/v10/finance/quoteSummary/%s?modules=summaryDetail,defaultKeyStatistics,financialData,price,earningsTrend,earnings&crumb=%s",
		url.QueryEscape(symbol),
		url.QueryEscape(yahooCrumb),
	)
	body, err := yahooFetch(u)
	if err != nil {
		return nil, err
	}

	var resp struct {
		QuoteSummary struct {
			Result []struct {
				SummaryDetail struct {
					TrailingPE    *struct{ Raw float64 `json:"raw"` } `json:"trailingPE"`
					ForwardPE     *struct{ Raw float64 `json:"raw"` } `json:"forwardPE"`
					MarketCap     *struct{ Raw float64 `json:"raw"` } `json:"marketCap"`
					DividendYield *struct{ Raw float64 `json:"raw"` } `json:"dividendYield"`
					Volume        *struct{ Raw int64   `json:"raw"` } `json:"volume"`
				} `json:"summaryDetail"`
				DefaultKeyStatistics struct {
					TrailingEps *struct{ Raw float64 `json:"raw"` } `json:"trailingEps"`
					ForwardEps  *struct{ Raw float64 `json:"raw"` } `json:"forwardEps"`
				} `json:"defaultKeyStatistics"`
				FinancialData struct {
					CurrentPrice *struct{ Raw float64 `json:"raw"` } `json:"currentPrice"`
				} `json:"financialData"`
				Price struct {
					RegularMarketPrice *struct{ Raw float64 `json:"raw"` } `json:"regularMarketPrice"`
				} `json:"price"`
				EarningsTrend struct {
					Trend []struct {
						Period           string `json:"period"`
						EarningsEstimate struct {
							Avg            *struct{ Raw float64 `json:"raw"` } `json:"avg"`
							NumberOfAnalysts *struct{ Raw int     `json:"raw"` } `json:"numberOfAnalysts"`
							Growth         *struct{ Raw float64 `json:"raw"` } `json:"growth"`
						} `json:"earningsEstimate"`
						RevenueEstimate struct {
							Avg    *struct{ Raw float64 `json:"raw"` } `json:"avg"`
							Growth *struct{ Raw float64 `json:"raw"` } `json:"growth"`
						} `json:"revenueEstimate"`
						EpsTrend struct {
							Current    *struct{ Raw float64 `json:"raw"` } `json:"current"`
							_7daysAgo  *struct{ Raw float64 `json:"raw"` } `json:"7daysAgo"`
							_30daysAgo *struct{ Raw float64 `json:"raw"` } `json:"30daysAgo"`
							_60daysAgo *struct{ Raw float64 `json:"raw"` } `json:"60daysAgo"`
							_90daysAgo *struct{ Raw float64 `json:"raw"` } `json:"90daysAgo"`
						} `json:"epsTrend"`
					} `json:"trend"`
				} `json:"earningsTrend"`
				Earnings struct {
					EarningsChart struct {
						Quarterly []struct {
							Date      string                  `json:"date"`
							Actual    *struct{ Raw float64 `json:"raw"` } `json:"actual"`
							Estimate  *struct{ Raw float64 `json:"raw"` } `json:"estimate"`
						} `json:"quarterly"`
					} `json:"earningsChart"`
				} `json:"earnings"`
				CalendarEvents struct {
					Earnings struct {
						EarningsDate []struct {
							Raw int64 `json:"raw"`
						} `json:"earningsDate"`
					} `json:"earnings"`
				} `json:"calendarEvents"`
			} `json:"result"`
			Error *struct {
				Description string `json:"description"`
			} `json:"error"`
		} `json:"quoteSummary"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if resp.QuoteSummary.Error != nil {
		return nil, fmt.Errorf("yahoo quote error: %s", resp.QuoteSummary.Error.Description)
	}
	if len(resp.QuoteSummary.Result) == 0 {
		return nil, fmt.Errorf("no quote data for %s", symbol)
	}

	r := resp.QuoteSummary.Result[0]
	m := &QuoteMetrics{Symbol: strings.ToUpper(symbol)}

	if r.FinancialData.CurrentPrice != nil {
		m.Price = r.FinancialData.CurrentPrice.Raw
	} else if r.Price.RegularMarketPrice != nil {
		m.Price = r.Price.RegularMarketPrice.Raw
	}
	if r.SummaryDetail.TrailingPE != nil {
		m.PeTrailing = r.SummaryDetail.TrailingPE.Raw
	}
	if r.SummaryDetail.ForwardPE != nil {
		m.PeForwardNextFY = r.SummaryDetail.ForwardPE.Raw
	}
	if r.SummaryDetail.MarketCap != nil {
		m.MarketCap = r.SummaryDetail.MarketCap.Raw
	}
	if r.SummaryDetail.DividendYield != nil {
		m.DivYield = r.SummaryDetail.DividendYield.Raw
	}
	if r.SummaryDetail.Volume != nil {
		m.Volume = r.SummaryDetail.Volume.Raw
	}
	if r.DefaultKeyStatistics.TrailingEps != nil {
		m.EpsTrailing = r.DefaultKeyStatistics.TrailingEps.Raw
	}
	if r.DefaultKeyStatistics.ForwardEps != nil {
		m.EpsForwardNextFY = r.DefaultKeyStatistics.ForwardEps.Raw
	}

	// Yahoo's summaryDetail.forwardPE uses the *next fiscal year* (+1y) estimate,
	// which can be 12-18 months ahead. Most sources (including Yahoo's own website)
	// display forward PE based on the *current fiscal year* (0y) estimate.
	// Use the 0y estimate when available for consistency.
	for _, t := range r.EarningsTrend.Trend {
		if t.Period == "0y" {
			if t.EarningsEstimate.Avg != nil {
				fy0Eps := t.EarningsEstimate.Avg.Raw
				if fy0Eps > 0 && m.Price > 0 {
					m.PeForward = m.Price / fy0Eps
					m.EpsForward = fy0Eps
				}
			}
			if t.EarningsEstimate.NumberOfAnalysts != nil {
				m.NumAnalysts = t.EarningsEstimate.NumberOfAnalysts.Raw
			}
			if t.EarningsEstimate.Growth != nil {
				m.EpsGrowth = t.EarningsEstimate.Growth.Raw
			}
			if t.RevenueEstimate.Growth != nil {
				m.RevenueGrowth = t.RevenueEstimate.Growth.Raw
			}
			if t.EpsTrend.Current != nil && t.EpsTrend._30daysAgo != nil {
				m.EpsRevision30d = t.EpsTrend.Current.Raw - t.EpsTrend._30daysAgo.Raw
			}
			break
		}
	}

	// Parse quarterly earnings history (actual vs estimate)
	if len(r.Earnings.EarningsChart.Quarterly) > 0 {
		q := r.Earnings.EarningsChart.Quarterly[len(r.Earnings.EarningsChart.Quarterly)-1]
		m.QuarterLabel = q.Date
		if q.Actual != nil {
			m.EpsActualQ = q.Actual.Raw
		}
		if q.Estimate != nil {
			m.EpsEstimateQ = q.Estimate.Raw
		}
		for _, eq := range r.Earnings.EarningsChart.Quarterly {
			if eq.Actual == nil || eq.Estimate == nil {
				continue
			}
			actual := eq.Actual.Raw
			estimate := eq.Estimate.Raw
			beatPct := 0.0
			if estimate != 0 {
				beatPct = ((actual - estimate) / math.Abs(estimate)) * 100
			}
			m.EarningsHistory = append(m.EarningsHistory, QuarterlyEarning{
				Date:     eq.Date,
				Actual:   actual,
				Estimate: estimate,
				BeatPct:  beatPct,
			})
		}
	}

	// Parse next earnings date
	if len(r.CalendarEvents.Earnings.EarningsDate) > 0 {
		m.NextEarningsDate = r.CalendarEvents.Earnings.EarningsDate[0].Raw
		m.NextEarningsTime = inferEarningsTime(m.NextEarningsDate)
	}

	return m, nil
}

// inferEarningsTime guesses whether earnings are pre-market or after-hours
// based on the hour of the timestamp in Eastern Time.
func inferEarningsTime(ts int64) string {
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return ""
	}
	t := time.Unix(ts, 0).In(loc)
	hour := t.Hour()
	if hour >= 4 && hour < 9 {
		return "Pre-market"
	}
	if hour >= 16 && hour <= 23 {
		return "After-hours"
	}
	return ""
}

// ---------- Batch Quote ----------

type BatchQuote struct {
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	Price         float64 `json:"price"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"change_percent"`
	MarketCap     float64 `json:"market_cap"`
	Volume        int64   `json:"volume"`
}

func GetBatchQuotes(symbols []string) ([]BatchQuote, error) {
	if err := ensureYahooSession(); err != nil {
		return nil, err
	}
	if len(symbols) == 0 {
		return nil, nil
	}

	// Yahoo batch quote supports up to ~100 symbols per call.
	const batchSize = 100
	var out []BatchQuote
	for i := 0; i < len(symbols); i += batchSize {
		end := i + batchSize
		if end > len(symbols) {
			end = len(symbols)
		}
		batch := symbols[i:end]
		quotes, err := getBatchQuotesSingle(batch)
		if err != nil {
			return nil, err
		}
		out = append(out, quotes...)
	}
	return out, nil
}

func getBatchQuotesSingle(symbols []string) ([]BatchQuote, error) {
	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s&crumb=%s",
		url.QueryEscape(strings.Join(symbols, ",")),
		url.QueryEscape(yahooCrumb),
	)
	body, err := yahooFetch(u)
	if err != nil {
		return nil, err
	}

	var resp struct {
		QuoteResponse struct {
			Result []struct {
				Symbol                 string  `json:"symbol"`
				ShortName              string  `json:"shortName"`
				RegularMarketPrice     float64 `json:"regularMarketPrice"`
				RegularMarketChange    float64 `json:"regularMarketChange"`
				RegularMarketChangePercent float64 `json:"regularMarketChangePercent"`
				MarketCap              float64 `json:"marketCap"`
				RegularMarketVolume    int64   `json:"regularMarketVolume"`
			} `json:"result"`
			Error *struct {
				Description string `json:"description"`
			} `json:"error"`
		} `json:"quoteResponse"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if resp.QuoteResponse.Error != nil {
		return nil, fmt.Errorf("yahoo batch quote error: %s", resp.QuoteResponse.Error.Description)
	}

	var out []BatchQuote
	for _, r := range resp.QuoteResponse.Result {
		out = append(out, BatchQuote{
			Symbol:        r.Symbol,
			Name:          r.ShortName,
			Price:         r.RegularMarketPrice,
			Change:        r.RegularMarketChange,
			ChangePercent: r.RegularMarketChangePercent,
			MarketCap:     r.MarketCap,
			Volume:        r.RegularMarketVolume,
		})
	}
	return out, nil
}

// ---------- Helpers ----------

func yahooFetch(url string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}
	return io.ReadAll(resp.Body)
}

// ---------- Options Chain ----------

type OptionContract struct {
	Strike          float64 `json:"strike"`
	Volume          int64   `json:"volume"`
	OpenInterest    int64   `json:"openInterest"`
	LastPrice       float64 `json:"lastPrice"`
	ImpliedVolatility float64 `json:"impliedVolatility"`
	InTheMoney      bool    `json:"inTheMoney"`
}

type OptionsChain struct {
	Symbol         string
	ExpirationDate int64
	Calls          []OptionContract
	Puts           []OptionContract
	CallVolume     int64
	PutVolume      int64
	CallOI         int64
	PutOI          int64
}

type OptionsSummary struct {
	Symbol             string
	CallVolume         int64
	PutVolume          int64
	CallOI             int64
	PutOI              int64
	PutCallVolumeRatio float64
	PutCallOIRatio     float64
}

func GetOptionsChain(symbol string) (*OptionsSummary, error) {
	if err := ensureYahooSession(); err != nil {
		return nil, err
	}

	u := fmt.Sprintf(
		"https://query2.finance.yahoo.com/v7/finance/options/%s?crumb=%s",
		url.QueryEscape(symbol),
		url.QueryEscape(yahooCrumb),
	)
	body, err := yahooFetch(u)
	if err != nil {
		return nil, err
	}

	var resp struct {
		OptionChain struct {
			Result []struct {
				UnderlyingSymbol string `json:"underlyingSymbol"`
				Options          []struct {
					ExpirationDate int64 `json:"expirationDate"`
					Calls          []struct {
						Strike          float64 `json:"strike"`
						Volume          int64   `json:"volume"`
						OpenInterest    int64   `json:"openInterest"`
						LastPrice       float64 `json:"lastPrice"`
						ImpliedVolatility float64 `json:"impliedVolatility"`
						InTheMoney      bool    `json:"inTheMoney"`
					} `json:"calls"`
					Puts []struct {
						Strike          float64 `json:"strike"`
						Volume          int64   `json:"volume"`
						OpenInterest    int64   `json:"openInterest"`
						LastPrice       float64 `json:"lastPrice"`
						ImpliedVolatility float64 `json:"impliedVolatility"`
						InTheMoney      bool    `json:"inTheMoney"`
					} `json:"puts"`
				} `json:"options"`
			} `json:"result"`
			Error *struct {
				Description string `json:"description"`
			} `json:"error"`
		} `json:"optionChain"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if resp.OptionChain.Error != nil {
		return nil, fmt.Errorf("yahoo options error: %s", resp.OptionChain.Error.Description)
	}
	if len(resp.OptionChain.Result) == 0 {
		return nil, fmt.Errorf("no options data for %s", symbol)
	}

	r := resp.OptionChain.Result[0]
	summary := &OptionsSummary{
		Symbol: strings.ToUpper(symbol),
	}

	for _, opt := range r.Options {
		for _, c := range opt.Calls {
			summary.CallVolume += c.Volume
			summary.CallOI += c.OpenInterest
		}
		for _, p := range opt.Puts {
			summary.PutVolume += p.Volume
			summary.PutOI += p.OpenInterest
		}
	}

	if summary.CallVolume > 0 {
		summary.PutCallVolumeRatio = float64(summary.PutVolume) / float64(summary.CallVolume)
	}
	if summary.CallOI > 0 {
		summary.PutCallOIRatio = float64(summary.PutOI) / float64(summary.CallOI)
	}

	return summary, nil
}
