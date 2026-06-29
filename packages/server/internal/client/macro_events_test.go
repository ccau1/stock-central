package client

import (
	"fmt"
	"testing"
)

func TestGetUpcomingMacroEvents(t *testing.T) {
	events, err := GetUpcomingMacroEvents(45)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) == 0 {
		t.Log("no upcoming macro events returned (expected depending on date)")
	}
	for _, e := range events {
		fmt.Printf("%s %s | %s | %s | %s\n", e.Date, e.Time, e.Name, e.Impact, e.Category)
	}
}
