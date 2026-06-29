package client

import (
	"sort"
	"time"
)

// MacroEvent represents an upcoming financial/economic announcement.
type MacroEvent struct {
	Date     string `json:"date"`     // YYYY-MM-DD
	Time     string `json:"time"`     // e.g. "08:30 ET" or "14:00 ET"
	Name     string `json:"name"`     // Event name
	Country  string `json:"country"`  // ISO country code, e.g. "US"
	Impact   string `json:"impact"`   // high, medium, low
	Category string `json:"category"` // monetary, employment, inflation, activity, sentiment
}

// macroEventsTZ is the timezone used for macro announcements (US Eastern Time).
var macroEventsTZ *time.Location

func init() {
	var err error
	macroEventsTZ, err = time.LoadLocation("America/New_York")
	if err != nil {
		macroEventsTZ = time.FixedZone("ET", -5*60*60)
	}
}

// fomcDecisionDates holds the second-day FOMC meeting dates (rate decision + statement).
// Sourced from the Federal Reserve public calendar. Updated as new schedules are published.
var fomcDecisionDates = []string{
	// 2025
	"2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18",
	"2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
	// 2026
	"2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
	"2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
	// 2027
	"2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09",
	"2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08",
}

// GetUpcomingMacroEvents returns curated upcoming macro announcements for the next windowDays.
// Events are generated from publicly-known schedules (FOMC) and recurring release rules (NFP, CPI, etc.).
func GetUpcomingMacroEvents(windowDays int) ([]MacroEvent, error) {
	if windowDays <= 0 {
		windowDays = 45
	}

	now := time.Now().In(macroEventsTZ)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, macroEventsTZ)
	end := today.AddDate(0, 0, windowDays)

	var events []MacroEvent

	// FOMC rate decisions (hardcoded from Fed calendar)
	for _, d := range fomcDecisionDates {
		date, err := time.ParseInLocation("2006-01-02", d, macroEventsTZ)
		if err != nil {
			continue
		}
		if !date.Before(today) && !date.After(end) {
			events = append(events, MacroEvent{
				Date:     date.Format("2006-01-02"),
				Time:     "14:00 ET",
				Name:     "FOMC Rate Decision",
				Country:  "US",
				Impact:   "high",
				Category: "monetary",
			})
		}
	}

	// Generate recurring releases for the window plus a small buffer.
	bufferEnd := end.AddDate(0, 1, 0)
	for d := today; !d.After(bufferEnd); d = d.AddDate(0, 0, 1) {
		// Nonfarm Payrolls: first Friday of the month at 08:30 ET
		if d.Weekday() == time.Friday && d.Day() <= 7 {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "08:30 ET",
				Name:     "Nonfarm Payrolls",
				Country:  "US",
				Impact:   "high",
				Category: "employment",
			})
		}

		// CPI Release: second Thursday of the month at 08:30 ET
		if d.Weekday() == time.Thursday && d.Day() >= 8 && d.Day() <= 14 {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "08:30 ET",
				Name:     "CPI Release",
				Country:  "US",
				Impact:   "high",
				Category: "inflation",
			})
		}

		// PPI Release: second Wednesday of the month at 08:30 ET
		if d.Weekday() == time.Wednesday && d.Day() >= 8 && d.Day() <= 14 {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "08:30 ET",
				Name:     "PPI Release",
				Country:  "US",
				Impact:   "medium",
				Category: "inflation",
			})
		}

		// ISM Manufacturing PMI: first business day of the month at 10:00 ET
		if isFirstBusinessDay(d) {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "10:00 ET",
				Name:     "ISM Manufacturing PMI",
				Country:  "US",
				Impact:   "medium",
				Category: "activity",
			})
		}

		// Retail Sales: around the 15th (next business day if weekend) at 08:30 ET
		if d.Day() == 15 || (d.Day() == 16 && d.Weekday() == time.Monday) || (d.Day() == 17 && d.Weekday() == time.Monday) {
			if d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
				events = append(events, MacroEvent{
					Date:     d.Format("2006-01-02"),
					Time:     "08:30 ET",
					Name:     "Retail Sales",
					Country:  "US",
					Impact:   "medium",
					Category: "activity",
				})
			}
		}

		// UMich Consumer Sentiment - Preliminary: second Friday of the month at 10:00 ET
		if d.Weekday() == time.Friday && d.Day() >= 8 && d.Day() <= 14 {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "10:00 ET",
				Name:     "UMich Consumer Sentiment (Prelim)",
				Country:  "US",
				Impact:   "medium",
				Category: "sentiment",
			})
		}

		// UMich Consumer Sentiment - Final: last Friday of the month at 10:00 ET
		if d.Weekday() == time.Friday && d.AddDate(0, 0, 7).Month() != d.Month() {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "10:00 ET",
				Name:     "UMich Consumer Sentiment (Final)",
				Country:  "US",
				Impact:   "low",
				Category: "sentiment",
			})
		}

		// Consumer Confidence: last Tuesday of the month at 10:00 ET
		if d.Weekday() == time.Tuesday && d.AddDate(0, 0, 7).Month() != d.Month() {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "10:00 ET",
				Name:     "Consumer Confidence",
				Country:  "US",
				Impact:   "medium",
				Category: "sentiment",
			})
		}

		// PCE Price Index: last business day of the month at 08:30 ET
		if isLastBusinessDay(d) {
			events = append(events, MacroEvent{
				Date:     d.Format("2006-01-02"),
				Time:     "08:30 ET",
				Name:     "PCE Price Index",
				Country:  "US",
				Impact:   "medium",
				Category: "inflation",
			})
		}
	}

	// Filter to window and sort.
	var result []MacroEvent
	for _, e := range events {
		date, _ := time.ParseInLocation("2006-01-02", e.Date, macroEventsTZ)
		if !date.Before(today) && !date.After(end) {
			result = append(result, e)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Date != result[j].Date {
			return result[i].Date < result[j].Date
		}
		return result[i].Time < result[j].Time
	})

	return result, nil
}

func isFirstBusinessDay(d time.Time) bool {
	if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
		return false
	}
	// First business day is the first non-weekend day of the month.
	firstOfMonth := time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, d.Location())
	for {
		if firstOfMonth.Weekday() != time.Saturday && firstOfMonth.Weekday() != time.Sunday {
			return d.Equal(firstOfMonth)
		}
		firstOfMonth = firstOfMonth.AddDate(0, 0, 1)
	}
}

func isLastBusinessDay(d time.Time) bool {
	if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
		return false
	}
	// Last business day is the last non-weekend day of the month.
	lastOfMonth := time.Date(d.Year(), d.Month()+1, 0, 0, 0, 0, 0, d.Location())
	for {
		if lastOfMonth.Weekday() != time.Saturday && lastOfMonth.Weekday() != time.Sunday {
			return d.Equal(lastOfMonth)
		}
		lastOfMonth = lastOfMonth.AddDate(0, 0, -1)
	}
}
