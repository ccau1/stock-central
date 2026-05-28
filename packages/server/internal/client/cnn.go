package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type FearGreedResult struct {
	CurrentValue  int    `json:"current_value"`
	PreviousValue int    `json:"previous_value"`
	Label         string `json:"label"`
	Timestamp     string `json:"timestamp"`
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

	var data struct {
		FearAndGreed struct {
			Score         float64 `json:"score"`
			PreviousClose float64 `json:"previous_close"`
			Rating        string  `json:"rating"`
		} `json:"fear_and_greed"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	return &FearGreedResult{
		CurrentValue:  int(data.FearAndGreed.Score),
		PreviousValue: int(data.FearAndGreed.PreviousClose),
		Label:         data.FearAndGreed.Rating,
		Timestamp:     time.Now().Format(time.RFC3339),
	}, nil
}
