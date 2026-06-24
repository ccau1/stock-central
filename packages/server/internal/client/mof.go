package client

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

var (
	mofJgbHistoricalURL = "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv"
	mofJgbCurrentURL    = "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv"
	mofClient           = &http.Client{Timeout: 30 * time.Second}
)

// MofJgbPoint represents a single date's JGB benchmark yields from the MOF.
type MofJgbPoint struct {
	Date   string
	Yields map[string]float64
}

// GetMofJgbYields fetches the historical and current JGB constant-maturity yield
// CSVs from MOF, merges them, and returns the most recent limit points.
// Set limit <= 0 for all data.
func GetMofJgbYields(limit int) ([]MofJgbPoint, error) {
	points, err := fetchAndParseMofJgbCSV(mofJgbHistoricalURL)
	if err != nil {
		return nil, err
	}

	currentPoints, err := fetchAndParseMofJgbCSV(mofJgbCurrentURL)
	if err == nil {
		seen := make(map[string]bool, len(points))
		for _, p := range points {
			seen[p.Date] = true
		}
		for _, p := range currentPoints {
			if seen[p.Date] {
				continue
			}
			points = append(points, p)
		}
	}

	if len(points) == 0 {
		return nil, fmt.Errorf("no valid mof yield points")
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Date < points[j].Date
	})

	if limit > 0 && len(points) > limit {
		points = points[len(points)-limit:]
	}

	return points, nil
}

func fetchAndParseMofJgbCSV(url string) ([]MofJgbPoint, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := mofClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mof request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mof returned HTTP %d", resp.StatusCode)
	}

	reader := csv.NewReader(resp.Body)
	reader.FieldsPerRecord = -1 // rows have trailing empty fields
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("mof csv parse failed: %w", err)
	}

	maturityMap := map[string]string{
		"1Y":  "1y",
		"2Y":  "2y",
		"3Y":  "3y",
		"4Y":  "4y",
		"5Y":  "5y",
		"6Y":  "6y",
		"7Y":  "7y",
		"8Y":  "8y",
		"9Y":  "9y",
		"10Y": "10y",
		"15Y": "15y",
		"20Y": "20y",
		"25Y": "25y",
		"30Y": "30y",
		"40Y": "40y",
	}

	dateCol := -1
	colMap := make(map[string]int)

	for _, row := range records {
		if len(row) == 0 {
			continue
		}
		if strings.TrimSpace(row[0]) == "Date" {
			for j, col := range row {
				col = strings.TrimSpace(col)
				if col == "Date" {
					dateCol = j
					continue
				}
				if key, ok := maturityMap[col]; ok {
					colMap[key] = j
				}
			}
			break
		}
	}

	if dateCol < 0 {
		return nil, fmt.Errorf("date column not found in mof csv")
	}
	if len(colMap) == 0 {
		return nil, fmt.Errorf("yield columns not found in mof csv")
	}

	var points []MofJgbPoint
	for _, row := range records {
		if len(row) <= dateCol {
			continue
		}
		dateStr := strings.TrimSpace(row[dateCol])
		if dateStr == "" || dateStr == "Date" {
			continue
		}

		t, err := time.Parse("2006/1/2", dateStr)
		if err != nil {
			continue
		}

		yields := make(map[string]float64)
		for key, colIdx := range colMap {
			if colIdx >= len(row) {
				continue
			}
			valStr := strings.TrimSpace(row[colIdx])
			if valStr == "" || valStr == "-" {
				continue
			}
			v, err := strconv.ParseFloat(valStr, 64)
			if err != nil {
				continue
			}
			yields[key] = v
		}
		if len(yields) == 0 {
			continue
		}

		points = append(points, MofJgbPoint{
			Date:   t.Format("2006-01-02"),
			Yields: yields,
		})
	}

	if len(points) == 0 {
		return nil, fmt.Errorf("no valid mof yield points")
	}

	return points, nil
}
