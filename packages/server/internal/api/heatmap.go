package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"os"
	"sort"

	"stockcentral/internal/client"
)

func init() {
	// Attempt to load Russell constituent JSON files at startup.
	// If loading fails for any reason, the compiled-in fallback maps remain.
	if err := loadRussellJSON("russell_1000.json", &russell1000Universe); err != nil {
		slog.Warn("failed to load russell_1000.json, using compiled-in fallback", "error", err)
	}
	if err := loadRussellJSON("russell_2000.json", &russell2000Universe); err != nil {
		slog.Warn("failed to load russell_2000.json, using compiled-in fallback", "error", err)
	}
}

func loadRussellJSON(filename string, target *map[string]string) error {
	// Try several common paths for local dev and Docker
	paths := []string{
		"internal/data/" + filename,
		"./internal/data/" + filename,
		"../internal/data/" + filename,
	}

	var data []byte
	var err error
	for _, p := range paths {
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if err != nil {
		return err
	}

	var payload struct {
		Tickers map[string]string `json:"tickers"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		return err
	}
	if len(payload.Tickers) == 0 {
		return fmt.Errorf("empty ticker map in %s", filename)
	}
	*target = payload.Tickers
	slog.Info("loaded Russell constituents from JSON", "file", filename, "count", len(payload.Tickers))
	return nil
}

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

// duplicateClassShareMap maps duplicate class-share tickers to their canonical representative.
// This is a manually-curated list of known duplicate share classes.
var duplicateClassShareMap = map[string]string{
	"GOOG":  "GOOGL",
	"FOX":   "FOXA",
	"NWS":   "NWSA",
	"BRK.B": "BRK-B",
	"UA":    "UAA",
}

// Dow Jones Industrial Average constituents (post Nov 2024 reconstitution).
var dowJones30Universe = map[string]string{
	"AMGN": "Health Care",
	"AXP":  "Financials",
	"AAPL": "Technology",
	"AMZN": "Consumer Discretionary",
	"BA":   "Industrials",
	"CAT":  "Industrials",
	"CVX":  "Energy",
	"CSCO": "Technology",
	"GS":   "Financials",
	"HD":   "Consumer Discretionary",
	"HON":  "Industrials",
	"IBM":  "Technology",
	"JNJ":  "Health Care",
	"JPM":  "Financials",
	"KO":   "Consumer Staples",
	"MCD":  "Consumer Discretionary",
	"MMM":  "Industrials",
	"MRK":  "Health Care",
	"MSFT": "Technology",
	"NKE":  "Consumer Discretionary",
	"NVDA": "Technology",
	"PG":   "Consumer Staples",
	"CRM":  "Technology",
	"SHW":  "Materials",
	"TRV":  "Financials",
	"UNH":  "Health Care",
	"VZ":   "Communication Services",
	"V":    "Financials",
	"WMT":  "Consumer Staples",
	"DIS":  "Communication Services",
}

// Dow Jones Transportation Average constituents (20 stocks).
var dowJones20Universe = map[string]string{
	"ALK":  "Airline",
	"AAL":  "Airline",
	"CAR":  "Rental and Leasing",
	"CHRW": "Trucking",
	"CSX":  "Railroads",
	"DAL":  "Airline",
	"EXPD": "Logistics",
	"FDX":  "Delivery",
	"JBHT": "Transportation",
	"KEX":  "Marine",
	"LSTR": "Transportation",
	"MATX": "Marine",
	"NSC":  "Railroads",
	"ODFL": "Trucking",
	"R":    "Transportation",
	"LUV":  "Airline",
	"UBER": "Transportation",
	"UNP":  "Railroads",
	"UAL":  "Airline",
	"UPS":  "Delivery",
}

// Dow Jones Utility Average constituents (15 stocks).
var dowJones15Universe = map[string]string{
	"AEP":  "Electric Utilities",
	"AWK":  "Water Utilities",
	"ATO":  "Gas Utilities",
	"ED":   "Electric Utilities",
	"D":    "Electric Utilities",
	"DUK":  "Electric Utilities",
	"EIX":  "Electric Utilities",
	"EXC":  "Diversified Utilities",
	"FE":   "Electric Utilities",
	"NEE":  "Electric Utilities",
	"PEG":  "Diversified Utilities",
	"SRE":  "Multi-Utilities",
	"SO":   "Electric Utilities",
	"VST":  "Independent Power",
	"XEL":  "Electric Utilities",
}

// KBW Nasdaq Bank Index constituents (~24 major U.S. banks).
var kbwBankUniverse = map[string]string{
	"JPM":  "Diversified Banks",
	"BAC":  "Diversified Banks",
	"WFC":  "Diversified Banks",
	"C":    "Diversified Banks",
	"USB":  "Diversified Banks",
	"PNC":  "Diversified Banks",
	"TFC":  "Diversified Banks",
	"COF":  "Consumer Finance",
	"SCHW": "Capital Markets",
	"BK":   "Capital Markets",
	"STT":  "Capital Markets",
	"RF":   "Diversified Banks",
	"CFG":  "Diversified Banks",
	"FITB": "Diversified Banks",
	"KEY":  "Diversified Banks",
	"HBAN": "Diversified Banks",
	"CMA":  "Diversified Banks",
	"MTB":  "Diversified Banks",
	"NTRS": "Capital Markets",
	"EWBC": "Diversified Banks",
	"WAL":  "Diversified Banks",
	"OZK":  "Diversified Banks",
	"AX":   "Diversified Banks",
	"FCNCA": "Diversified Banks",
}

// Representative Nasdaq Composite constituents (NDX + notable additional Nasdaq stocks).
var nasdaqCompositeUniverse = map[string]string{
	// Nasdaq 100 base
	"AAPL": "Technology",
	"ABNB": "Consumer Discretionary",
	"ADBE": "Technology",
	"ADI":  "Technology",
	"ADP":  "Industrials",
	"ADSK": "Technology",
	"AEP":  "Utilities",
	"ALGN": "Health Care",
	"AMAT": "Technology",
	"AMD":  "Technology",
	"AMGN": "Health Care",
	"AMZN": "Consumer Discretionary",
	"ANSS": "Technology",
	"APP":  "Technology",
	"ARM":  "Technology",
	"ASML": "Technology",
	"AVGO": "Technology",
	"AXON": "Industrials",
	"AZPN": "Technology",
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
	"ENPH": "Technology",
	"EXC":  "Utilities",
	"FANG": "Energy",
	"FAST": "Industrials",
	"FER":  "Industrials",
	"FTNT": "Technology",
	"GFS":  "Technology",
	"GEHC": "Health Care",
	"GILD": "Health Care",
	"GOOG": "Communication Services",
	"GOOGL": "Communication Services",
	"HON":  "Industrials",
	"IDXX": "Health Care",
	"ILMN": "Health Care",
	"INTC": "Technology",
	"INTU": "Technology",
	"ISRG": "Health Care",
	"KDP":  "Consumer Staples",
	"KHC":  "Consumer Staples",
	"KLAC": "Technology",
	"LRCX": "Technology",
	"LULU": "Consumer Discretionary",
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
	"SGEN": "Health Care",
	"SHOP": "Technology",
	"SNPS": "Technology",
	"SNOW": "Technology",
	"SPLK": "Technology",
	"STX":  "Technology",
	"TEAM": "Technology",
	"TMUS": "Communication Services",
	"TSLA": "Consumer Discretionary",
	"TTWO": "Communication Services",
	"TXN":  "Technology",
	"VRSK": "Industrials",
	"VRTX": "Health Care",
	"WBD":  "Communication Services",
	"WDAY": "Technology",
	"WDC":  "Technology",
	"XEL":  "Utilities",
	"ZM":   "Technology",
	"ZS":   "Technology",
	// Additional Nasdaq-listed stocks beyond NDX
	"AAL":  "Airline",
	"AFRM": "Consumer Finance",
	"BILI": "Communication Services",
	"BYND": "Consumer Staples",
	"CELH": "Consumer Staples",
	"CHWY": "Consumer Discretionary",
	"CPNG": "Consumer Discretionary",
	"CRSR": "Technology",
	"DOCN": "Technology",
	"DUOL": "Technology",
	"EXAS": "Health Care",
	"FIVN": "Technology",
	"FSLY": "Technology",
	"HOOD": "Financials",
	"MRNA": "Health Care",
	"NIO":  "Consumer Discretionary",
	"PATH": "Technology",
	"PTON": "Consumer Discretionary",
	"RBLX": "Communication Services",
	"RIVN": "Consumer Discretionary",
	"RKLB": "Industrials",
	"SNAP": "Communication Services",
	"SOFI": "Financials",
	"SPOT": "Communication Services",
	"SQ":   "Financials",
	"TDOC": "Health Care",
	"TWLO": "Technology",
	"U":    "Technology",
	"UPST": "Financials",
	"VFC":  "Consumer Discretionary",
	"WBA":  "Consumer Staples",
	"XPEV": "Consumer Discretionary",
	"Z":    "Real Estate",
	"ZI":   "Technology",
}

// Representative mid/small-cap universe for Russell 2000 proxy (~80 stocks).
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
	{ID: "sp500", Name: "S&P 500 Index"},
	{ID: "nasdaq100", Name: "Nasdaq 100 Index"},
	{ID: "nasdaqComposite", Name: "Nasdaq Composite Index"},
	{ID: "dowjones30", Name: "Dow Jones Industrial Average"},
	{ID: "dowjones20", Name: "Dow Jones Transportation Average"},
	{ID: "dowjones15", Name: "Dow Jones Utility Average"},
	{ID: "dowjones65", Name: "Dow Jones Composite Average"},
	{ID: "kbwBank", Name: "KBW NASDAQ Bank Index"},
	{ID: "russell1000", Name: "Russell 1000 Index"},
	{ID: "russell2000", Name: "Russell 2000 Index"},
	{ID: "russell3000", Name: "Russell 3000 Index"},
	{ID: "allUS", Name: "All US companies"},
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
	case "dowjones30":
		for sym := range dowJones30Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = dowJones30Universe
	case "dowjones20":
		for sym := range dowJones20Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = dowJones20Universe
	case "dowjones15":
		for sym := range dowJones15Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = dowJones15Universe
	case "dowjones65":
		symbolToSector = make(map[string]string)
		for sym, sector := range dowJones30Universe {
			symbols = append(symbols, sym)
			symbolToSector[sym] = sector
		}
		for sym, sector := range dowJones20Universe {
			symbols = append(symbols, sym)
			symbolToSector[sym] = sector
		}
		for sym, sector := range dowJones15Universe {
			symbols = append(symbols, sym)
			symbolToSector[sym] = sector
		}
	case "kbwBank":
		for sym := range kbwBankUniverse {
			symbols = append(symbols, sym)
		}
		symbolToSector = kbwBankUniverse
	case "nasdaqComposite":
		for sym := range nasdaqCompositeUniverse {
			symbols = append(symbols, sym)
		}
		symbolToSector = nasdaqCompositeUniverse
	case "russell1000":
		for sym := range russell1000Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = russell1000Universe
	case "russell2000":
		for sym := range russell2000Universe {
			symbols = append(symbols, sym)
		}
		symbolToSector = russell2000Universe
	case "russell3000", "allUS":
		symbolToSector = make(map[string]string)
		for sym, sector := range russell1000Universe {
			symbols = append(symbols, sym)
			symbolToSector[sym] = sector
		}
		for sym, sector := range russell2000Universe {
			if symbolToSector[sym] != "" {
				continue // skip duplicates
			}
			symbols = append(symbols, sym)
			symbolToSector[sym] = sector
		}
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
	seen := make(map[string]bool)
	for _, q := range quotes {
		symbol := q.Symbol
		if canonical, ok := duplicateClassShareMap[symbol]; ok {
			symbol = canonical
		}
		if seen[symbol] {
			continue
		}
		seen[symbol] = true

		sector := symbolToSector[symbol]
		if sector == "" {
			sector = "Other"
		}
		industry := symbolToIndustry[symbol]
		if industry == "" {
			industry = sector
		}

		groupKey := sector
		if groupBy == "industry" {
			groupKey = industry
		}

		groupMap[groupKey] = append(groupMap[groupKey], HeatmapStock{
			Symbol:        symbol,
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
