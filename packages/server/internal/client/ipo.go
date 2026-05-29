package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"time"
)

var ipoHttpClient = &http.Client{Timeout: 15 * time.Second}

// IPOEntry represents a single upcoming IPO.
type IPOEntry struct {
	Symbol       string `json:"symbol"`
	Name         string `json:"name"`
	Date         string `json:"date"`
	Exchange     string `json:"exchange"`
	PriceRange   string `json:"price_range"`
	Shares       int64  `json:"shares"`
	DealSize     int64  `json:"deal_size"`
	MarketCap    int64  `json:"market_cap"`
	Revenue      int64  `json:"revenue"`
	Status       string `json:"status"`
}

// GetUpcomingIPOs fetches the upcoming IPO calendar from stockanalysis.com
// and returns the top N upcoming IPOs sorted by date.
func GetUpcomingIPOs(limit int) ([]IPOEntry, error) {
	req, err := http.NewRequest("GET", "https://stockanalysis.com/ipos/calendar/", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := ipoHttpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stockanalysis returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var entries []IPOEntry

	// Extract embedded JSON arrays: thisWeekData, nextWeekData, laterData
	thisWeek := extractDataArray(string(body), "thisWeekData")
	nextWeek := extractDataArray(string(body), "nextWeekData")
	later := extractDataArray(string(body), "laterData")

	entries = append(entries, parseIPOEntries(thisWeek, "This Week")...)
	entries = append(entries, parseIPOEntries(nextWeek, "Next Week")...)
	entries = append(entries, parseIPOEntries(later, "Upcoming")...)

	// Sort by date ascending
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Date < entries[j].Date
	})

	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}

	return entries, nil
}

// extractDataArray pulls a JS/JSON array out of inline page data.
func extractDataArray(html, key string) string {
	re := regexp.MustCompile(key + `:(\[.*?\])[,}]`)
	m := re.FindStringSubmatch(html)
	if len(m) < 2 {
		return "[]"
	}
	return m[1]
}

func parseIPOEntries(jsonStr, status string) []IPOEntry {
	var raw []struct {
		S            string `json:"s"`
		N            string `json:"n"`
		IpoDate      string `json:"ipoDate"`
		Exchange     string `json:"exchange"`
		IpoPriceRange string `json:"ipoPriceRange"`
		SharesOffered int64  `json:"sharesOffered"`
		DS           int64  `json:"ds"`
		MarketCap    int64  `json:"marketCap"`
		Revenue      int64  `json:"revenue"`
	}

	// stockanalysis embeds JSON with unquoted keys in some contexts,
	// but the arrays we target use quoted keys. Try standard JSON first.
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		// Fallback: the array may contain JS object literals with unquoted keys.
		// Convert them to JSON by wrapping keys in quotes.
		fixed := fixJSObjects(jsonStr)
		_ = json.Unmarshal([]byte(fixed), &raw)
	}

	var entries []IPOEntry
	for _, r := range raw {
		entries = append(entries, IPOEntry{
			Symbol:    r.S,
			Name:      r.N,
			Date:      r.IpoDate,
			Exchange:  r.Exchange,
			PriceRange: r.IpoPriceRange,
			Shares:    r.SharesOffered,
			DealSize:  r.DS,
			MarketCap: r.MarketCap,
			Revenue:   r.Revenue,
			Status:    status,
		})
	}
	return entries
}

// fixJSObjects converts a JS object literal array (with unquoted keys) into valid JSON.
func fixJSObjects(s string) string {
	// Simple heuristic: find patterns like {key:"value"} and quote the key.
	re := regexp.MustCompile(`([{,])([a-zA-Z_][a-zA-Z0-9_]*):`)
	return re.ReplaceAllString(s, `$1"$2":`)
}
