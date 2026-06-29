package client

import (
	"testing"
)

func TestParseFearGreedResponse(t *testing.T) {
	body := []byte(`{
		"fear_and_greed": {
			"score": 52.5,
			"previous_close": 48.0,
			"rating": "Neutral"
		},
		"fear_and_greed_historical": {
			"data": [
				{"x": 1704067200000, "y": 45, "rating": "Fear"},
				{"x": 1706745600000, "y": 55, "rating": "Greed"},
				{"x": 1709251200000, "y": 50, "rating": "Neutral"}
			]
		}
	}`)

	result, err := parseFearGreedResponse(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.CurrentValue != 52 {
		t.Errorf("expected current value 52, got %d", result.CurrentValue)
	}
	if result.PreviousValue != 48 {
		t.Errorf("expected previous value 48, got %d", result.PreviousValue)
	}
	if result.Label != "Neutral" {
		t.Errorf("expected label Neutral, got %s", result.Label)
	}
	if len(result.History) != 3 {
		t.Fatalf("expected 3 history points, got %d", len(result.History))
	}

	first := result.History[0]
	if first.Date != "2024-01-01" || first.Value != 45 || first.Label != "Fear" {
		t.Errorf("unexpected first history point: %+v", first)
	}

	last := result.History[2]
	if last.Date != "2024-03-01" || last.Value != 50 || last.Label != "Neutral" {
		t.Errorf("unexpected last history point: %+v", last)
	}
}

func TestParseFearGreedResponseDeduplicatesByDate(t *testing.T) {
	body := []byte(`{
		"fear_and_greed": {
			"score": 25,
			"previous_close": 24,
			"rating": "fear"
		},
		"fear_and_greed_historical": {
			"data": [
				{"x": 1704067200000, "y": 45, "rating": "fear"},
				{"x": 1704067200000, "y": 46, "rating": "fear"},
				{"x": 1704153600000, "y": 47, "rating": "fear"}
			]
		}
	}`)

	result, err := parseFearGreedResponse(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.History) != 2 {
		t.Fatalf("expected 2 deduplicated history points, got %d", len(result.History))
	}
	if result.History[0].Value != 46 {
		t.Errorf("expected first date to keep last value 46, got %d", result.History[0].Value)
	}
	if result.History[1].Value != 47 {
		t.Errorf("expected second date value 47, got %d", result.History[1].Value)
	}
}

func TestParseFearGreedResponseAltHistorical(t *testing.T) {
	body := []byte(`{
		"fear_and_greed": {
			"score": 30,
			"previous_close": 35,
			"rating": "Fear"
		},
		"historical": [
			{"x": 1704067200000, "y": 40, "rating": "Fear"}
		]
	}`)

	result, err := parseFearGreedResponse(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.History) != 1 {
		t.Fatalf("expected 1 history point from fallback, got %d", len(result.History))
	}
	if result.History[0].Value != 40 {
		t.Errorf("unexpected fallback history value: %+v", result.History[0])
	}
}
