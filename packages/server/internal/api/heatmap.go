package api

import (
	"fmt"
	"math"
	"net/http"
	"sort"

	"stockcentral/internal/client"
)

// Nasdaq 100 constituents (post Dec 2025 reconstitution) mapped to display sectors.
// Display sectors are simplified from GICS for cleaner heatmap grouping.
var nasdaq100Universe = map[string]string{
	"AAPL": "Technology",
	"ABNB": "Consumer Discretionary",
	"ADBE": "Technology",
	"ADI":  "Technology",
	"ADP":  "Industrials",
	"ADSK": "Technology",
	"AEP":  "Utilities",
	"ALNY": "Health Care",
	"AMAT": "Technology",
	"AMD":  "Technology",
	"AMGN": "Health Care",
	"AMZN": "Consumer Discretionary",
	"APP":  "Technology",
	"ARM":  "Technology",
	"ASML": "Technology",
	"AVGO": "Technology",
	"AXON": "Industrials",
	"BKNG": "Consumer Discretionary",
	"BKR":  "Energy",
	"CCEP": "Consumer Staples",
	"CDNS": "Technology",
	"CEG":  "Utilities",
	"CHTR": "Communication Services",
	"CMCSA": "Communication Services",
	"COST": "Consumer Staples",
	"CPRT": "Industrials",
	"CRWD": "Technology",
	"CSCO": "Technology",
	"CSGP": "Real Estate",
	"CSX":  "Industrials",
	"CTAS": "Industrials",
	"CTSH": "Technology",
	"DASH": "Consumer Discretionary",
	"DDOG": "Technology",
	"DXCM": "Health Care",
	"EA":   "Communication Services",
	"EXC":  "Utilities",
	"FANG": "Energy",
	"FAST": "Industrials",
	"FER":  "Industrials",
	"FTNT": "Technology",
	"GEHC": "Health Care",
	"GILD": "Health Care",
	"GOOG": "Communication Services",
	"GOOGL": "Communication Services",
	"HON":  "Industrials",
	"IDXX": "Health Care",
	"INSM": "Health Care",
	"INTC": "Technology",
	"INTU": "Technology",
	"ISRG": "Health Care",
	"KDP":  "Consumer Staples",
	"KHC":  "Consumer Staples",
	"KLAC": "Technology",
	"LIN":  "Materials",
	"LRCX": "Technology",
	"MAR":  "Consumer Discretionary",
	"MCHP": "Technology",
	"MDLZ": "Consumer Staples",
	"MELI": "Consumer Discretionary",
	"META": "Communication Services",
	"MNST": "Consumer Staples",
	"MPWR": "Technology",
	"MRVL": "Technology",
	"MSFT": "Technology",
	"MSTR": "Technology",
	"MU":   "Technology",
	"NFLX": "Communication Services",
	"NVDA": "Technology",
	"NXPI": "Technology",
	"ODFL": "Industrials",
	"ORLY": "Consumer Discretionary",
	"PANW": "Technology",
	"PAYX": "Industrials",
	"PCAR": "Industrials",
	"PDD":  "Consumer Discretionary",
	"PEP":  "Consumer Staples",
	"PLTR": "Technology",
	"PYPL": "Financials",
	"QCOM": "Technology",
	"REGN": "Health Care",
	"ROP":  "Industrials",
	"ROST": "Consumer Discretionary",
	"SBUX": "Consumer Discretionary",
	"SHOP": "Technology",
	"SNPS": "Technology",
	"STX":  "Technology",
	"TEAM": "Technology",
	"TMUS": "Communication Services",
	"TRI":  "Communication Services",
	"TSLA": "Consumer Discretionary",
	"TTWO": "Communication Services",
	"TXN":  "Technology",
	"VRSK": "Industrials",
	"VRTX": "Health Care",
	"WBD":  "Communication Services",
	"WDAY": "Technology",
	"WDC":  "Technology",
	"WMT":  "Consumer Staples",
	"XEL":  "Utilities",
	"ZS":   "Technology",
}

type HeatmapStock struct {
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	Sector        string  `json:"sector"`
	Industry      string  `json:"industry"`
	Price         float64 `json:"price"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"change_percent"`
	MarketCap     float64 `json:"market_cap"`
	Volume        int64   `json:"volume"`
}

type HeatmapSector struct {
	Sector   string         `json:"sector"`
	Stocks   []HeatmapStock `json:"stocks"`
	TotalCap float64        `json:"total_cap"`
}

type HeatmapData struct {
	Sectors []HeatmapSector `json:"sectors"`
}

type HeatmapUniverse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

var heatmapUniverses = []HeatmapUniverse{
	{ID: "nasdaq100", Name: "Nasdaq 100 Index"},
	{ID: "sp500", Name: "S&P 500 Index"},
}

func (a *API) getHeatmapUniverses(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, heatmapUniverses)
}

// Nasdaq 100 constituents mapped to GICS-like industries for granular heatmap grouping.
var nasdaq100Industries = map[string]string{
	// Electronic Technology
	"NVDA": "Electronic Technology",
	"AMD":  "Electronic Technology",
	"AVGO": "Electronic Technology",
	"MU":   "Electronic Technology",
	"INTC": "Electronic Technology",
	"QCOM": "Electronic Technology",
	"CSCO": "Electronic Technology",
	"LRCX": "Electronic Technology",
	"KLAC": "Electronic Technology",
	"TXN":  "Electronic Technology",
	"ADI":  "Electronic Technology",
	"AMAT": "Electronic Technology",
	"MCHP": "Electronic Technology",
	"MRVL": "Electronic Technology",
	"NXPI": "Electronic Technology",
	"WDC":  "Electronic Technology",
	"STX":  "Electronic Technology",
	"ARM":  "Electronic Technology",
	"ASML": "Electronic Technology",

	// Technology Services
	"AAPL": "Technology Services",
	"MSFT": "Technology Services",
	"ADBE": "Technology Services",
	"INTU": "Technology Services",
	"PANW": "Technology Services",
	"CRWD": "Technology Services",
	"DDOG": "Technology Services",
	"FTNT": "Technology Services",
	"TEAM": "Technology Services",
	"WDAY": "Technology Services",
	"SNPS": "Technology Services",
	"CDNS": "Technology Services",
	"ADSK": "Technology Services",
	"CTSH": "Technology Services",
	"PLTR": "Technology Services",
	"SHOP": "Technology Services",
	"APP":  "Technology Services",
	"MSTR": "Technology Services",
	"ZS":   "Technology Services",
	"MPWR": "Technology Services",

	// Interactive Media
	"GOOG":  "Interactive Media",
	"GOOGL": "Interactive Media",
	"META":  "Interactive Media",

	// Entertainment
	"NFLX": "Entertainment",
	"EA":   "Entertainment",
	"TTWO": "Entertainment",
	"WBD":  "Entertainment",

	// Media
	"CMCSA": "Media",
	"CHTR":  "Media",
	"TRI":   "Media",

	// Wireless Telecommunications
	"TMUS": "Wireless Telecommunications",

	// Health Technology
	"AMGN": "Health Technology",
	"GILD": "Health Technology",
	"REGN": "Health Technology",
	"VRTX": "Health Technology",
	"ALNY": "Health Technology",
	"INSM": "Health Technology",
	"DXCM": "Health Technology",
	"ISRG": "Health Technology",
	"IDXX": "Health Technology",
	"GEHC": "Health Technology",

	// Retail Trade
	"AMZN": "Retail Trade",
	"COST": "Retail Trade",
	"WMT":  "Retail Trade",
	"SBUX": "Retail Trade",
	"ORLY": "Retail Trade",
	"ROST": "Retail Trade",
	"BKNG": "Retail Trade",
	"DASH": "Retail Trade",
	"MAR":  "Retail Trade",
	"ABNB": "Retail Trade",

	// Consumer Durables
	"TSLA": "Consumer Durables",
	"MELI": "Consumer Durables",
	"PDD":  "Consumer Durables",

	// Consumer Non-Durables
	"PEP":  "Consumer Non-Durables",
	"MDLZ": "Consumer Non-Durables",
	"KHC":  "Consumer Non-Durables",
	"KDP":  "Consumer Non-Durables",
	"MNST": "Consumer Non-Durables",
	"CCEP": "Consumer Non-Durables",

	// Finance
	"PYPL": "Finance",

	// Industrial Services
	"ADP":  "Industrial Services",
	"AXON": "Industrial Services",
	"CPRT": "Industrial Services",
	"CTAS": "Industrial Services",
	"FAST": "Industrial Services",
	"FER":  "Industrial Services",
	"PAYX": "Industrial Services",
	"VRSK": "Industrial Services",

	// Producer Manufacturing
	"HON":  "Producer Manufacturing",
	"PCAR": "Producer Manufacturing",
	"ROP":  "Producer Manufacturing",

	// Transportation
	"CSX":  "Transportation",
	"ODFL": "Transportation",

	// Energy Minerals
	"BKR":  "Energy Minerals",
	"FANG": "Energy Minerals",

	// Utilities
	"AEP": "Utilities",
	"CEG": "Utilities",
	"EXC": "Utilities",
	"XEL": "Utilities",

	// Real Estate
	"CSGP": "Real Estate",

	// Process Industries
	"LIN": "Process Industries",
}

func (a *API) getHeatmap(w http.ResponseWriter, r *http.Request) {
	universe := r.URL.Query().Get("universe")
	if universe == "" {
		universe = "nasdaq100"
	}
	groupBy := r.URL.Query().Get("group_by")
	if groupBy == "" {
		groupBy = "industry"
	}

	var symbols []string
	var symbolToSector map[string]string
	var symbolToIndustry map[string]string
	switch universe {
	case "nasdaq100":
		for sym := range nasdaq100Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = nasdaq100Universe
		symbolToIndustry = nasdaq100Industries
	case "sp500":
		for sym := range sp500Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = sp500Universe
	default:
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid universe"))
		return
	}

	if len(symbols) == 0 {
		respondJSON(w, http.StatusOK, HeatmapData{})
		return
	}

	// Yahoo batch quote supports up to ~100 symbols per call.
	quotes, err := client.GetBatchQuotes(symbols)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	groupMap := make(map[string][]HeatmapStock)
	for _, q := range quotes {
		sector := symbolToSector[q.Symbol]
		if sector == "" {
			sector = "Other"
		}
		industry := symbolToIndustry[q.Symbol]
		if industry == "" {
			industry = sector
		}

		groupKey := sector
		if groupBy == "industry" {
			groupKey = industry
		}

		groupMap[groupKey] = append(groupMap[groupKey], HeatmapStock{
			Symbol:        q.Symbol,
			Name:          q.Name,
			Sector:        sector,
			Industry:      industry,
			Price:         q.Price,
			Change:        math.Round(q.Change*100) / 100,
			ChangePercent: math.Round(q.ChangePercent*100) / 100,
			MarketCap:     q.MarketCap,
			Volume:        q.Volume,
		})
	}

	var sectors []HeatmapSector
	for group, stocks := range groupMap {
		sort.Slice(stocks, func(i, j int) bool {
			return stocks[i].MarketCap > stocks[j].MarketCap
		})
		var totalCap float64
		for _, s := range stocks {
			totalCap += s.MarketCap
		}
		sectors = append(sectors, HeatmapSector{
			Sector:   group,
			Stocks:   stocks,
			TotalCap: totalCap,
		})
	}

	// Sort sectors by total market cap descending
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].TotalCap > sectors[j].TotalCap
	})

	respondJSON(w, http.StatusOK, HeatmapData{Sectors: sectors})
}
