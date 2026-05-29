package client

import (
	"fmt"
	"testing"
)

func TestGetUpcomingIPOs(t *testing.T) {
	ipos, err := GetUpcomingIPOs(5)
	if err != nil {
		t.Logf("Fetch error (expected in some environments): %v", err)
		return
	}
	for _, ipo := range ipos {
		fmt.Printf("%+v\n", ipo)
	}
}
