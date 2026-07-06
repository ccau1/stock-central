package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"stockcentral/internal/client"
	"stockcentral/internal/query"
)

// queryRequest is the payload for POST /api/v1/query and /api/v1/query/validate.
type queryRequest struct {
	Source string                 `json:"source"`
	Params map[string]interface{} `json:"params"`
}

// queryResponse wraps a DataFrame with optional metadata.
type queryResponse struct {
	Source    string           `json:"source"`
	RowCount  int              `json:"row_count"`
	Columns   []query.Column   `json:"columns"`
	Rows      [][]interface{}  `json:"rows"`
	Error     string           `json:"error,omitempty"`
}

// registerQueryProviders wires all data sources into the query engine.
func registerQueryProviders(e *query.Engine) {
	e.Register(query.PriceHistoryProvider{})
	e.Register(query.MetricProvider{})
	e.Register(query.FredProvider{})
	e.Register(formulaQueryProvider{})
	e.Register(query.ExpressionProvider{Executor: e.Execute})
}

// queryRoutes mounts generic panel query endpoints under /api/v1/panels/query.
func (a *API) queryRoutes(r chi.Router) {
	r.Post("/", a.postQuery)
	r.Post("/validate", a.postQueryValidate)
	r.Get("/sources", a.getQuerySources)
}

func (a *API) postQuery(w http.ResponseWriter, r *http.Request) {
	var req queryRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}

	df, err := a.engine.Execute(r.Context(), query.Spec{Source: req.Source, Params: req.Params})
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	respondJSON(w, http.StatusOK, queryResponse{
		Source:   req.Source,
		RowCount: len(df.Rows),
		Columns:  df.Columns,
		Rows:     df.Rows,
	})
}

func (a *API) postQueryValidate(w http.ResponseWriter, r *http.Request) {
	var req queryRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}

	// Validation executes the query but caps the result to a small preview.
	df, err := a.engine.Execute(r.Context(), query.Spec{Source: req.Source, Params: req.Params})
	resp := queryResponse{Source: req.Source}
	if err != nil {
		resp.Error = err.Error()
		respondJSON(w, http.StatusOK, resp)
		return
	}

	limit := 10
	if len(df.Rows) < limit {
		limit = len(df.Rows)
	}
	resp.RowCount = len(df.Rows)
	resp.Columns = df.Columns
	resp.Rows = df.Rows[:limit]
	respondJSON(w, http.StatusOK, resp)
}

func (a *API) getQuerySources(w http.ResponseWriter, r *http.Request) {
	sources := a.engine.Sources()
	respondJSON(w, http.StatusOK, map[string]interface{}{"sources": sources})
}

// formulaQueryProvider executes technical-analysis formulas on candle data.
//
// Params:
//   - symbol: string (required)
//   - range: string (default "1y")
//   - interval: string (default "1d")
//   - expression: string, e.g. "sma(20, close()) / sma(50, close())" (required)
type formulaQueryProvider struct{}

func (formulaQueryProvider) Source() string { return "formula" }

func (formulaQueryProvider) Execute(ctx context.Context, params map[string]interface{}) (*query.DataFrame, error) {
	symbol := queryStringParam(params, "symbol", "")
	if symbol == "" {
		return nil, fmt.Errorf("formula requires symbol param")
	}
	rng := queryStringParam(params, "range", "1y")
	interval := queryStringParam(params, "interval", "1d")
	expr := queryStringParam(params, "expression", "")
	if expr == "" {
		return nil, fmt.Errorf("formula requires expression param")
	}

	candles, err := client.GetCandles(symbol, rng, interval)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch candles for %s: %w", symbol, err)
	}

	points, err := evaluateFormulaExpression(candles, expr)
	if err != nil {
		return nil, fmt.Errorf("invalid formula expression: %w", err)
	}

	columns := []query.Column{
		{Name: "date", Type: query.ColumnTypeTime},
		{Name: "value", Type: query.ColumnTypeNumber},
	}
	rows := make([][]interface{}, len(points))
	for i, p := range points {
		rows[i] = []interface{}{p.Date, p.Value}
	}
	return &query.DataFrame{Columns: columns, Rows: rows}, nil
}

// queryStringParam is a local helper so we don't export query package helpers.
func queryStringParam(params map[string]interface{}, key, def string) string {
	v, ok := params[key]
	if !ok {
		return def
	}
	if s, ok := v.(string); ok {
		return s
	}
	return def
}
