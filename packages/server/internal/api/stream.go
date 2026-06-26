package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"stockcentral/internal/client"
)

// ---------- News Stream (SSE) ----------

type NewsStreamItem struct {
	UUID      string  `json:"uuid"`
	Title     string  `json:"title"`
	Source    string  `json:"source"`
	Published int64   `json:"published"`
	URL       string  `json:"url"`
	Impact    int     `json:"impact"`
	ImpactLabel string `json:"impact_label"`
	Tickers   []string `json:"tickers"`
}

var (
	newsSubscribers   = make(map[chan []NewsStreamItem]bool)
	newsSubscribersMu sync.RWMutex
	lastNewsItems     = make(map[string]NewsStreamItem)
	lastNewsMu        sync.RWMutex
)

func init() {
	go newsPoller()
}

func newsPoller() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	// Poll immediately on start
	pollAndBroadcast()

	for range ticker.C {
		pollAndBroadcast()
	}
}

func pollAndBroadcast() {
	// Fetch general market news using SPY as a proxy
	articles, err := client.GetNews([]string{"SPY", "QQQ", "DIA"}, 20)
	if err != nil {
		return
	}

	var newItems []NewsStreamItem
	for _, a := range articles {
		item := NewsStreamItem{
			UUID:      a.UUID,
			Title:     a.Title,
			Source:    a.Publisher,
			Published: a.ProviderPublishTime,
			URL:       a.Link,
			Impact:    computeNewsImpact(a),
			ImpactLabel: computeImpactLabel(computeNewsImpact(a)),
			Tickers:   extractTickers(a.Title + " " + a.Link),
		}

		lastNewsMu.RLock()
		_, seen := lastNewsItems[item.UUID]
		lastNewsMu.RUnlock()

		if !seen {
			newItems = append(newItems, item)
			lastNewsMu.Lock()
			lastNewsItems[item.UUID] = item
			lastNewsMu.Unlock()
		}
	}

	if len(newItems) > 0 {
		// Limit cache size
		lastNewsMu.Lock()
		if len(lastNewsItems) > 500 {
			lastNewsItems = make(map[string]NewsStreamItem)
		}
		lastNewsMu.Unlock()

		broadcastNews(newItems)
	}
}

func broadcastNews(items []NewsStreamItem) {
	newsSubscribersMu.RLock()
	defer newsSubscribersMu.RUnlock()
	for ch := range newsSubscribers {
		select {
		case ch <- items:
		default:
		}
	}
}

func computeNewsImpact(a client.YahooNewsArticle) int {
	score := 50 // base

	// Source tier
	source := strings.ToLower(a.Publisher)
	highImpactSources := []string{"bloomberg", "reuters", "cnbc", "wall street journal", "wsj", "financial times", "ft.com", "marketwatch", "seeking alpha"}
	mediumImpactSources := []string{"yahoo finance", "investopedia", "benzinga", "the street", "barron's"}

	for _, s := range highImpactSources {
		if strings.Contains(source, s) {
			score += 20
			break
		}
	}
	for _, s := range mediumImpactSources {
		if strings.Contains(source, s) {
			score += 10
			break
		}
	}

	// Keyword analysis
	title := strings.ToLower(a.Title)
	highKeywords := []string{"earnings", "merger", "acquisition", "buyout", "fda", "approval", "bankruptcy", "layoff", "restructuring", "dividend", "split", "guidance", "outlook", "cut", "raise", "surge", "plunge", "crash", "rally"}
	mediumKeywords := []string{"upgrade", "downgrade", "target", "analyst", "forecast", "revenue", "profit", "loss", "contract", "partnership", "deal"}

	for _, kw := range highKeywords {
		if strings.Contains(title, kw) {
			score += 15
			break
		}
	}
	for _, kw := range mediumKeywords {
		if strings.Contains(title, kw) {
			score += 8
			break
		}
	}

	if score > 100 {
		score = 100
	}
	return score
}

func computeImpactLabel(score int) string {
	if score >= 80 {
		return "High"
	}
	if score >= 60 {
		return "Medium"
	}
	return "Low"
}

func (a *API) isAllowedOrigin(origin string) bool {
	for _, allowed := range a.corsOrigins {
		if allowed == origin {
			return true
		}
	}
	return false
}

func (a *API) newsStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	if origin := r.Header.Get("Origin"); a.isAllowedOrigin(origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := make(chan []NewsStreamItem, 10)
	newsSubscribersMu.Lock()
	newsSubscribers[ch] = true
	newsSubscribersMu.Unlock()

	defer func() {
		newsSubscribersMu.Lock()
		delete(newsSubscribers, ch)
		newsSubscribersMu.Unlock()
		close(ch)
	}()

	// Send initial cached news
	lastNewsMu.RLock()
	var initial []NewsStreamItem
	for _, item := range lastNewsItems {
		initial = append(initial, item)
	}
	lastNewsMu.RUnlock()
	if len(initial) > 0 {
		fmt.Fprintf(w, "data: %s\n\n", mustJSON(initial))
		flusher.Flush()
	}

	// Keep connection alive
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case items := <-ch:
			fmt.Fprintf(w, "data: %s\n\n", mustJSON(items))
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprintf(w, ":heartbeat\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(b)
}
