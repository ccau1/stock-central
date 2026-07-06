package query

import (
	"context"
	"testing"
)

type testProvider struct{}

func (testProvider) Source() string { return "test" }

func (testProvider) Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error) {
	return &DataFrame{
		Columns: []Column{{Name: "date", Type: ColumnTypeTime}, {Name: "value", Type: ColumnTypeNumber}},
		Rows:    [][]interface{}{{"2025-01-01", 1}, {"2025-01-02", 2}},
	}, nil
}

func TestEngineRegisterAndExecute(t *testing.T) {
	eng := NewEngine()
	eng.Register(testProvider{})

	if got := eng.Sources(); len(got) != 1 || got[0] != "test" {
		t.Fatalf("unexpected sources: %v", got)
	}

	df, err := eng.Execute(context.Background(), Spec{Source: "test", Params: nil})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if len(df.Columns) != 2 || len(df.Rows) != 2 {
		t.Fatalf("unexpected frame: %+v", df)
	}
}

func TestEngineUnknownSource(t *testing.T) {
	eng := NewEngine()
	_, err := eng.Execute(context.Background(), Spec{Source: "missing", Params: nil})
	if err == nil {
		t.Fatal("expected error for unknown source")
	}
}

func TestEmptyFrame(t *testing.T) {
	df := Empty([]Column{{Name: "date", Type: ColumnTypeTime}})
	if len(df.Columns) != 1 || len(df.Rows) != 0 {
		t.Fatalf("unexpected empty frame: %+v", df)
	}
}

func TestParseSymbols(t *testing.T) {
	if got := parseSymbols("AAPL"); len(got) != 1 || got[0] != "AAPL" {
		t.Fatalf("unexpected single symbol parse: %v", got)
	}
	if got := parseSymbols([]interface{}{"AAPL", "MSFT"}); len(got) != 2 {
		t.Fatalf("unexpected array symbol parse: %v", got)
	}
	if got := parseSymbols(nil); got != nil {
		t.Fatalf("expected nil, got %v", got)
	}
}
