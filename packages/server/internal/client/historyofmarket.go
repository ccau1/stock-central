package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

var homClient = &http.Client{Timeout: 15 * time.Second}

// SP500ForwardPEData is the response shape from historyofmarket.com.
type SP500ForwardPEData struct {
	Updated      string                  `json:"updated"`
	Label        string                  `json:"label"`
	Current      SP500ForwardPECurrent   `json:"current"`
	HistoryStarts SP500HistoryStarts     `json:"historyStarts"`
	Trailing     []SP500PEObservation    `json:"trailing"`
	Forward      []SP500PEObservation    `json:"forward"`
}

type SP500ForwardPECurrent struct {
	Trailing        float64 `json:"trailing"`
	Forward         float64 `json:"forward"`
	TrailingCoverage float64 `json:"trailingCoverage"`
	ForwardCoverage  float64 `json:"forwardCoverage"`
	TotalWeight     float64 `json:"totalWeight"`
}

type SP500HistoryStarts struct {
	Trailing string `json:"trailing"`
	Forward  string `json:"forward"`
}

type SP500PEObservation struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// GetSP500ForwardPE fetches the latest S&P 500 forward 12-month P/E from
// History of Market. This is the consensus forward P/E for the index, which is
// the standard input for the equity risk premium (Fed model).
func GetSP500ForwardPE() (float64, error) {
	const url = "https://historyofmarket.com/api/sp500/forward-pe.json"
	resp, err := homClient.Get(url)
	if err != nil {
		return 0, fmt.Errorf("historyofmarket request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("historyofmarket returned HTTP %d", resp.StatusCode)
	}

	var data SP500ForwardPEData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, fmt.Errorf("historyofmarket decode failed: %w", err)
	}

	if data.Current.Forward <= 0 {
		return 0, fmt.Errorf("historyofmarket forward P/E unavailable")
	}

	return data.Current.Forward, nil
}
