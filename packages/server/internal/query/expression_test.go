package query

import (
	"context"
	"testing"
)

func TestExpressionProvider(t *testing.T) {
	eng := NewEngine()
	eng.Register(ExpressionProvider{Executor: eng.Execute})
	eng.Register(testProvider{})

	df, err := eng.Execute(context.Background(), Spec{
		Source: "expression",
		Params: map[string]interface{}{
			"expression": "a + b * 2",
			"variables": map[string]interface{}{
				"a": map[string]interface{}{
					"source": "test",
					"params": map[string]interface{}{},
				},
				"b": map[string]interface{}{
					"source": "test",
					"params": map[string]interface{}{},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("expression execute failed: %v", err)
	}
	if len(df.Columns) != 2 || df.Columns[0].Name != "date" || df.Columns[1].Name != "value" {
		t.Fatalf("unexpected columns: %+v", df.Columns)
	}
	if len(df.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(df.Rows))
	}
	// Both variables return the same frame: date=2025-01-01 value=1, date=2025-01-02 value=2.
	// a + b * 2 -> 1 + 1*2 = 3, 2 + 2*2 = 6
	if df.Rows[0][1] != 3.0 {
		t.Fatalf("expected 3, got %v", df.Rows[0][1])
	}
	if df.Rows[1][1] != 6.0 {
		t.Fatalf("expected 6, got %v", df.Rows[1][1])
	}
}

func TestExpressionCompactVariable(t *testing.T) {
	eng := NewEngine()
	eng.Register(ExpressionProvider{Executor: eng.Execute})
	eng.Register(testProvider{})

	df, err := eng.Execute(context.Background(), Spec{
		Source: "expression",
		Params: map[string]interface{}{
			"expression": "a + b",
			"variables": map[string]interface{}{
				"a": "test{}",
				"b": "test{}",
			},
		},
	})
	if err != nil {
		t.Fatalf("expression execute failed: %v", err)
	}
	if len(df.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(df.Rows))
	}
	if df.Rows[0][1] != 2.0 {
		t.Fatalf("expected 2, got %v", df.Rows[0][1])
	}
}

func TestExpressionInlineQueries(t *testing.T) {
	eng := NewEngine()
	eng.Register(ExpressionProvider{Executor: eng.Execute})
	eng.Register(testProvider{})

	df, err := eng.Execute(context.Background(), Spec{
		Source: "expression",
		Params: map[string]interface{}{
			"expression": "test{} + test{}",
		},
	})
	if err != nil {
		t.Fatalf("expression execute failed: %v", err)
	}
	if len(df.Rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(df.Rows))
	}
	if df.Rows[0][1] != 2.0 {
		t.Fatalf("expected 2, got %v", df.Rows[0][1])
	}
}

func TestExpressionInvalidVariable(t *testing.T) {
	eng := NewEngine()
	eng.Register(ExpressionProvider{Executor: eng.Execute})

	_, err := eng.Execute(context.Background(), Spec{
		Source: "expression",
		Params: map[string]interface{}{
			"expression": "a + b",
			"variables": map[string]interface{}{
				"a": map[string]interface{}{
					"source": "test",
					"params": map[string]interface{}{},
				},
			},
		},
	})
	if err == nil {
		t.Fatal("expected error for undefined variable")
	}
}
