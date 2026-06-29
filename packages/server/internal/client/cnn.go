package client

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

type FearGreedHistoryPoint struct {
	Value int    `json:"value"`
	Label string `json:"label"`
	Date  string `json:"date"`
}

type FearGreedResult struct {
	CurrentValue  int                     `json:"current_value"`
	PreviousValue int                     `json:"previous_value"`
	Label         string                  `json:"label"`
	Timestamp     string                  `json:"timestamp"`
	History       []FearGreedHistoryPoint `json:"history"`
}

func asString(v any) string {
	s, _ := v.(string)
	return s
}

func asFloat(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case json.Number:
		f, _ := n.Float64()
		return f
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	}
	return 0
}

func parseHistoryTimestamp(v any) (time.Time, bool) {
	switch n := v.(type) {
	case float64:
		// Treat as milliseconds if large, otherwise seconds.
		if n > 1e10 {
			return time.Unix(int64(n)/1000, 0).UTC(), true
		}
		return time.Unix(int64(n), 0).UTC(), true
	case json.Number:
		f, err := n.Float64()
		if err != nil {
			return time.Time{}, false
		}
		if f > 1e10 {
			return time.Unix(int64(f)/1000, 0).UTC(), true
		}
		return time.Unix(int64(f), 0).UTC(), true
	case string:
		s := strings.TrimSpace(n)
		// Try ISO8601 / RFC3339 first.
		for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05Z", "2006-01-02T15:04:05+00:00", "2006-01-02"} {
			if t, err := time.Parse(layout, s); err == nil {
				return t.UTC(), true
			}
		}
		// Try numeric timestamp.
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			if f > 1e10 {
				return time.Unix(int64(f)/1000, 0).UTC(), true
			}
			return time.Unix(int64(f), 0).UTC(), true
		}
	}
	return time.Time{}, false
}

func extractHistoryArray(raw map[string]any) []any {
	// Try the most common CNN layout: fear_and_greed_historical.data
	if fgh, ok := raw["fear_and_greed_historical"]; ok {
		switch v := fgh.(type) {
		case map[string]any:
			if data, ok := v["data"].([]any); ok {
				return data
			}
		case []any:
			return v
		}
	}
	// Fallback layouts.
	if fg, ok := raw["fear_and_greed"].(map[string]any); ok {
		if hist, ok := fg["historical"].([]any); ok {
			return hist
		}
	}
	if hist, ok := raw["historical"].([]any); ok {
		return hist
	}
	return nil
}

func parseFearGreedResponse(body []byte) (*FearGreedResult, error) {
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	score := 0
	previousClose := 0
	rating := ""
	if fg, ok := raw["fear_and_greed"].(map[string]any); ok {
		score = int(asFloat(fg["score"]))
		previousClose = int(asFloat(fg["previous_close"]))
		rating = asString(fg["rating"])
	}

	byDate := make(map[string]FearGreedHistoryPoint)
	rawHistory := extractHistoryArray(raw)
	slog.Debug("parsing fear-greed history", "raw_points", len(rawHistory))

	for i, item := range rawHistory {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}

		// Value: prefer "y", then "score", then "value".
		val := asFloat(m["y"])
		if val == 0 {
			val = asFloat(m["score"])
		}
		if val == 0 {
			val = asFloat(m["value"])
		}

		// Timestamp: prefer "x", then "timestamp", then "date".
		t, ok := parseHistoryTimestamp(m["x"])
		if !ok {
			t, ok = parseHistoryTimestamp(m["timestamp"])
		}
		if !ok {
			if d := asString(m["date"]); d != "" {
				var err error
				t, err = time.Parse("2006-01-02", d)
				ok = err == nil
			}
		}
		if !ok {
			slog.Warn("skipping fear-greed history point with unparseable timestamp", "index", i, "keys", fmt.Sprintf("%v", m))
			continue
		}

		// Label: prefer "rating", then "label".
		label := asString(m["rating"])
		if label == "" {
			label = asString(m["label"])
		}

		date := t.Format("2006-01-02")
		// Keep the last value seen for each date (CNN may send intraday updates).
		byDate[date] = FearGreedHistoryPoint{
			Value: int(val),
			Label: label,
			Date:  date,
		}
	}

	history := make([]FearGreedHistoryPoint, 0, len(byDate))
	for _, p := range byDate {
		history = append(history, p)
	}

	// Sort ascending by date so the series is chronological.
	sort.Slice(history, func(i, j int) bool {
		return history[i].Date < history[j].Date
	})

	slog.Info("parsed fear-greed data", "current", score, "history_points", len(history), "first", firstDate(history), "last", lastDate(history))

	return &FearGreedResult{
		CurrentValue:  score,
		PreviousValue: previousClose,
		Label:         rating,
		Timestamp:     time.Now().Format(time.RFC3339),
		History:       history,
	}, nil
}

func firstDate(h []FearGreedHistoryPoint) string {
	if len(h) == 0 {
		return ""
	}
	return h[0].Date
}

func lastDate(h []FearGreedHistoryPoint) string {
	if len(h) == 0 {
		return ""
	}
	return h[len(h)-1].Date
}

func GetFearGreed() (*FearGreedResult, error) {
	url := "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("CNN API returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return parseFearGreedResponse(body)
}
