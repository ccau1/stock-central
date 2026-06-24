package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"
)

var (
	fredAPIKey = os.Getenv("FRED_API_KEY")
	fredClient = &http.Client{Timeout: 15 * time.Second}
)

// FredEnabled returns true when a FRED API key is configured.
func FredEnabled() bool {
	return fredAPIKey != ""
}

// FredObservation represents a single FRED series observation.
type FredObservation struct {
	Date  string `json:"date"`
	Value string `json:"value"`
}

// FredObservationsResponse is the FRED API response shape.
type FredObservationsResponse struct {
	Observations []FredObservation `json:"observations"`
}

// GetFredSeries fetches the most recent non-empty observations for a FRED series.
func GetFredSeries(seriesID string, limit int) ([]FredObservation, error) {
	if fredAPIKey == "" {
		return nil, fmt.Errorf("FRED_API_KEY not configured")
	}
	if seriesID == "" {
		return nil, fmt.Errorf("seriesID is required")
	}
	if limit <= 0 {
		limit = 10
	}

	u := fmt.Sprintf(
		"https://api.stlouisfed.org/fred/series/observations?series_id=%s&api_key=%s&file_type=json&sort_order=desc&limit=%d",
		url.QueryEscape(seriesID),
		url.QueryEscape(fredAPIKey),
		limit*3,
	)

	resp, err := fredClient.Get(u)
	if err != nil {
		return nil, fmt.Errorf("fred request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fred returned HTTP %d for %s", resp.StatusCode, seriesID)
	}

	var data FredObservationsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("fred decode failed: %w", err)
	}

	var out []FredObservation
	for _, obs := range data.Observations {
		if obs.Value == "" || obs.Value == "." {
			continue
		}
		if _, err := strconv.ParseFloat(obs.Value, 64); err != nil {
			continue
		}
		out = append(out, obs)
		if len(out) >= limit {
			break
		}
	}

	if len(out) == 0 {
		return nil, fmt.Errorf("no valid observations for %s", seriesID)
	}
	return out, nil
}

// GetFredLatest fetches the most recent non-empty observation for a FRED series.
// Returns 0 and an error if the key is missing or the series cannot be fetched.
func GetFredLatest(seriesID string) (float64, error) {
	if fredAPIKey == "" {
		return 0, fmt.Errorf("FRED_API_KEY not configured")
	}
	if seriesID == "" {
		return 0, fmt.Errorf("seriesID is required")
	}

	u := fmt.Sprintf(
		"https://api.stlouisfed.org/fred/series/observations?series_id=%s&api_key=%s&file_type=json&sort_order=desc&limit=10",
		url.QueryEscape(seriesID),
		url.QueryEscape(fredAPIKey),
	)

	resp, err := fredClient.Get(u)
	if err != nil {
		return 0, fmt.Errorf("fred request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("fred returned HTTP %d for %s", resp.StatusCode, seriesID)
	}

	var data FredObservationsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, fmt.Errorf("fred decode failed: %w", err)
	}

	for _, obs := range data.Observations {
		if obs.Value == "" || obs.Value == "." {
			continue
		}
		v, err := strconv.ParseFloat(obs.Value, 64)
		if err != nil {
			continue
		}
		return v, nil
	}

	return 0, fmt.Errorf("no valid observations for %s", seriesID)
}

// GetFredLatestMultiple fetches the latest value for multiple FRED series in parallel.
// Results omit series that failed to fetch.
func GetFredLatestMultiple(seriesIDs []string) (map[string]float64, error) {
	if fredAPIKey == "" {
		return nil, fmt.Errorf("FRED_API_KEY not configured")
	}

	type result struct {
		id    string
		value float64
		err   error
	}

	ch := make(chan result, len(seriesIDs))
	for _, id := range seriesIDs {
		go func(id string) {
			v, err := GetFredLatest(id)
			ch <- result{id: id, value: v, err: err}
		}(id)
	}

	out := make(map[string]float64)
	var firstErr error
	for range seriesIDs {
		r := <-ch
		if r.err != nil {
			if firstErr == nil {
				firstErr = r.err
			}
			continue
		}
		out[r.id] = r.value
	}

	if len(out) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return out, nil
}
