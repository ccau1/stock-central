package api

import (
	"math"
	"net/http"
)

type ImportantPersonTrade struct {
	Person      string  `json:"person"`
	PersonTitle string  `json:"person_title"`
	Ticker      string  `json:"ticker"`
	Company     string  `json:"company"`
	Action      string  `json:"action"` // Buy, Sell, Option Exercise
	Shares      int64   `json:"shares"`
	Value       float64 `json:"value"`
	Date        string  `json:"date"`
	FilingURL   string  `json:"filing_url"`
	Notes       string  `json:"notes"`
}

// importantPeopleTrades returns notable trades by public figures.
// In production this would scrape SEC Form 4 filings, Senate disclosures,
// and 13F filings. For now we seed with realistic representative data.
func (a *API) importantPeopleTrades(w http.ResponseWriter, r *http.Request) {
	trades := []ImportantPersonTrade{
		{
			Person:      "Warren Buffett",
			PersonTitle: "Berkshire Hathaway CEO",
			Ticker:      "OXY",
			Company:     "Occidental Petroleum",
			Action:      "Buy",
			Shares:      5_900_000,
			Value:       345_000_000,
			Date:        "2025-05-15",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000078003",
			Notes:       "Added to existing position; 13F amendment",
		},
		{
			Person:      "Warren Buffett",
			PersonTitle: "Berkshire Hathaway CEO",
			Ticker:      "AAPL",
			Company:     "Apple Inc.",
			Action:      "Sell",
			Shares:      100_000_000,
			Value:       18_200_000_000,
			Date:        "2025-02-28",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983",
			Notes:       "Reduced stake; tax considerations cited",
		},
		{
			Person:      "Nancy Pelosi",
			PersonTitle: "Former House Speaker",
			Ticker:      "NVDA",
			Company:     "NVIDIA Corporation",
			Action:      "Buy",
			Shares:      10_000,
			Value:       1_800_000,
			Date:        "2025-05-20",
			FilingURL:   "https://efdsearch.senate.gov/search/home/",
			Notes:       "Periodic transaction report filed",
		},
		{
			Person:      "Nancy Pelosi",
			PersonTitle: "Former House Speaker",
			Ticker:      "TSLA",
			Company:     "Tesla, Inc.",
			Action:      "Sell",
			Shares:      25_000,
			Value:       7_500_000,
			Date:        "2025-04-10",
			FilingURL:   "https://efdsearch.senate.gov/search/home/",
			Notes:       "Partial position closure",
		},
		{
			Person:      "Donald Trump",
			PersonTitle: "President",
			Ticker:      "DJT",
			Company:     "Trump Media & Technology",
			Action:      "Sell",
			Shares:      114_750_000,
			Value:       3_400_000_000,
			Date:        "2025-03-25",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001849635",
			Notes:       "Lock-up expiry disposition",
		},
		{
			Person:      "Cathie Wood",
			PersonTitle: "ARK Invest CEO",
			Ticker:      "COIN",
			Company:     "Coinbase Global",
			Action:      "Buy",
			Shares:      150_000,
			Value:       27_000_000,
			Date:        "2025-05-22",
			FilingURL:   "https://ark-funds.com/trade-notifications",
			Notes:       "ARKK daily trade notification",
		},
		{
			Person:      "Cathie Wood",
			PersonTitle: "ARK Invest CEO",
			Ticker:      "TSLA",
			Company:     "Tesla, Inc.",
			Action:      "Sell",
			Shares:      80_000,
			Value:       24_000_000,
			Date:        "2025-05-21",
			FilingURL:   "https://ark-funds.com/trade-notifications",
			Notes:       "Portfolio rebalancing",
		},
		{
			Person:      "Michael Burry",
			PersonTitle: "Scion Asset Management",
			Ticker:      "GOOGL",
			Company:     "Alphabet Inc.",
			Action:      "Buy",
			Shares:      80_000,
			Value:       14_000_000,
			Date:        "2025-05-14",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001336528",
			Notes:       "New position; 13F-Q1 disclosure",
		},
		{
			Person:      "Michael Burry",
			PersonTitle: "Scion Asset Management",
			Ticker:      "JD",
			Company:     "JD.com",
			Action:      "Sell",
			Shares:      150_000,
			Value:       4_500_000,
			Date:        "2025-05-14",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001336528",
			Notes:       "Closed position; 13F-Q1 disclosure",
		},
		{
			Person:      "David Tepper",
			PersonTitle: "Appaloosa Management",
			Ticker:      "META",
			Company:     "Meta Platforms",
			Action:      "Buy",
			Shares:      500_000,
			Value:       280_000_000,
			Date:        "2025-05-12",
			FilingURL:   "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001652048",
			Notes:       "Increased allocation significantly",
		},
	}

	// Sort by date descending
	for i := 0; i < len(trades)-1; i++ {
		for j := i + 1; j < len(trades); j++ {
			if trades[i].Date < trades[j].Date {
				trades[i], trades[j] = trades[j], trades[i]
			}
		}
	}

	// Round values for cleaner JSON
	for i := range trades {
		trades[i].Value = math.Round(trades[i].Value)
	}

	respondJSON(w, http.StatusOK, trades)
}
