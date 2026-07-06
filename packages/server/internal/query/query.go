// Package query provides a generic data-query layer for dashboard panels.
//
// Queries are declarative JSON/YAML specs with a "source" and source-specific
// "params". Each source is backed by a Provider that returns a normalized
// DataFrame (columns + rows). The goal is to let professional users write
// panel queries without hard-coding new API endpoints for every data source.
package query

import (
	"context"
	"fmt"
)

// ColumnType describes the semantic type of a data-frame column.
type ColumnType string

const (
	ColumnTypeString  ColumnType = "string"
	ColumnTypeNumber  ColumnType = "number"
	ColumnTypeTime    ColumnType = "time"
	ColumnTypeBoolean ColumnType = "boolean"
)

// Column is a single column definition in a DataFrame.
type Column struct {
	Name string     `json:"name"`
	Type ColumnType `json:"type"`
}

// DataFrame is a normalized, source-agnostic tabular result.
type DataFrame struct {
	Columns []Column        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

// Spec is a declarative query description.
type Spec struct {
	Source string                 `json:"source"`
	Params map[string]interface{} `json:"params"`
}

// Provider executes queries for a single source.
type Provider interface {
	// Source returns the unique source identifier this provider handles.
	Source() string
	// Execute runs the query described by params and returns a DataFrame.
	Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error)
}

// Engine holds registered providers and executes specs.
type Engine struct {
	providers map[string]Provider
}

// NewEngine creates an empty query engine.
func NewEngine() *Engine {
	return &Engine{providers: make(map[string]Provider)}
}

// Register adds a provider to the engine. It panics if two providers claim the
// same source.
func (e *Engine) Register(p Provider) {
	src := p.Source()
	if _, exists := e.providers[src]; exists {
		panic(fmt.Sprintf("query provider already registered for source %q", src))
	}
	e.providers[src] = p
}

// Execute runs the given query spec against the registered provider.
func (e *Engine) Execute(ctx context.Context, spec Spec) (*DataFrame, error) {
	if spec.Source == "" {
		return nil, fmt.Errorf("query source is required")
	}
	p, ok := e.providers[spec.Source]
	if !ok {
		return nil, fmt.Errorf("unknown query source %q", spec.Source)
	}
	return p.Execute(ctx, spec.Params)
}

// Sources returns the list of registered source identifiers.
func (e *Engine) Sources() []string {
	out := make([]string, 0, len(e.providers))
	for src := range e.providers {
		out = append(out, src)
	}
	return out
}

// Empty returns a DataFrame with the given columns and no rows.
func Empty(cols []Column) *DataFrame {
	return &DataFrame{Columns: cols, Rows: [][]interface{}{}}
}
