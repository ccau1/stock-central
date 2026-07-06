package query

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// ExpressionProvider combines multiple sub-queries with arithmetic.
//
// Params:
//   - expression: string arithmetic expression using query names (required)
//   - queries: map[name]QuerySpec — sub-queries to execute and align (required)
//
// Each sub-query must return a data frame with a "date" column and at least one
// numeric column. For single-series results the first numeric column is used.
// For multi-series results you can reference a specific column with "query.column".
//
// Example:
//
//	expression: "a - b"
//	queries:
//	  a:
//	    source: price_history
//	    params: { symbol: AAPL, range: 1y, close_only: true }
//	  b:
//	    source: formula
//	    params: { symbol: AAPL, expression: "sma(20, close())" }
type ExpressionProvider struct {
	// Executor is injected so recursive sub-queries can be run.
	Executor func(ctx context.Context, spec Spec) (*DataFrame, error)
}

func (ExpressionProvider) Source() string { return "expression" }

func (p ExpressionProvider) Execute(ctx context.Context, params map[string]interface{}) (*DataFrame, error) {
	exprRaw, ok := params["expression"].(string)
	if !ok || strings.TrimSpace(exprRaw) == "" {
		return nil, fmt.Errorf("expression requires expression param")
	}

	// Prefer `queries`; fall back to `variables` for backward compatibility.
	queriesRaw, ok := params["queries"].(map[string]interface{})
	if !ok || len(queriesRaw) == 0 {
		queriesRaw, ok = params["variables"].(map[string]interface{})
	}
	if !ok {
		queriesRaw = make(map[string]interface{})
	}

	// Allow inline compact queries inside the expression string, e.g.:
	//   price_history{symbol: AAPL, range: 1y} - formula{symbol: AAPL, expression: "sma(20, close())"}
	// They are extracted into auto-generated query names and removed from the expression.
	exprRaw, inlineQueries, err := extractInlineQueries(exprRaw)
	if err != nil {
		return nil, fmt.Errorf("invalid inline query in expression: %w", err)
	}
	for k, v := range inlineQueries {
		if _, exists := queriesRaw[k]; exists {
			return nil, fmt.Errorf("inline query name %q conflicts with explicit query", k)
		}
		queriesRaw[k] = v
	}

	if len(queriesRaw) == 0 {
		return nil, fmt.Errorf("expression requires queries param")
	}

	// Parse and validate the expression early.
	expr, err := parseExpression(exprRaw)
	if err != nil {
		return nil, fmt.Errorf("invalid expression: %w", err)
	}

	// Collect required variable/column references.
	refs := expr.references()

	// Parse and execute each named sub-query.
	varFrames := make(map[string]*DataFrame, len(queriesRaw))
	for name, raw := range queriesRaw {
		spec, err := parseQuerySpec(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid query %q: %w", name, err)
		}
		df, err := p.Executor(ctx, spec)
		if err != nil {
			return nil, fmt.Errorf("failed to execute query %q: %w", name, err)
		}
		varFrames[name] = df
	}

	// Determine the date index from all frames and validate references.
	dateSet := make(map[string]struct{})
	for i := range refs {
		ref := &refs[i]
		df, ok := varFrames[ref.varName]
		if !ok {
			return nil, fmt.Errorf("undefined query %q in expression", ref.varName)
		}
		colIdx := -1
		if ref.column != "" {
			colIdx = getColumnIndex(df, ref.column)
			if colIdx < 0 {
				return nil, fmt.Errorf("query %q has no column %q", ref.varName, ref.column)
			}
		} else {
			colIdx = firstNumericColumn(df)
			if colIdx < 0 {
				return nil, fmt.Errorf("query %q has no numeric column", ref.varName)
			}
		}
		ref.colIdx = colIdx
		for _, row := range df.Rows {
			dateSet[normalizeDate(row[0].(string))] = struct{}{}
		}
	}

	if len(dateSet) == 0 {
		return Empty([]Column{{Name: "date", Type: ColumnTypeTime}, {Name: "value", Type: ColumnTypeNumber}}), nil
	}

	dates := sortedDates(dateSet)

	// Build per-variable value maps keyed by date.
	valueMaps := make(map[string]map[string]float64, len(refs))
	for _, ref := range refs {
		df := varFrames[ref.varName]
		m := make(map[string]float64, len(df.Rows))
		for _, row := range df.Rows {
			date := normalizeDate(row[0].(string))
			v := row[ref.colIdx]
			if f, ok := toFloat(v); ok {
				m[date] = f
			}
		}
		valueMaps[ref.key()] = m
	}

	columns := []Column{
		{Name: "date", Type: ColumnTypeTime},
		{Name: "value", Type: ColumnTypeNumber},
	}
	rows := make([][]interface{}, 0, len(dates))

	ctxEval := &evalCtx{values: valueMaps}
	for _, d := range dates {
		ctxEval.date = d
		v := expr.eval(ctxEval)
		if !math.IsNaN(v) {
			rows = append(rows, []interface{}{d, math.Round(v*100)/100})
		}
	}

	return &DataFrame{Columns: columns, Rows: rows}, nil
}

type variableRef struct {
	varName string
	column  string
	colIdx  int
}

func (r variableRef) key() string {
	if r.column == "" {
		return r.varName
	}
	return r.varName + "." + r.column
}

func parseQuerySpec(raw interface{}) (Spec, error) {
	switch v := raw.(type) {
	case Spec:
		return v, nil
	case map[string]interface{}:
		src, _ := v["source"].(string)
		params, _ := v["params"].(map[string]interface{})
		if src == "" {
			return Spec{}, fmt.Errorf("variable spec missing source")
		}
		return Spec{Source: src, Params: params}, nil
	case string:
		if isCompactQueryString(v) {
			return parseCompactQuery(v)
		}
		return Spec{}, fmt.Errorf("query spec string must be a compact query")
	default:
		return Spec{}, fmt.Errorf("query spec must be an object or compact query string")
	}
}

func firstNumericColumn(df *DataFrame) int {
	for i, c := range df.Columns {
		if c.Type == ColumnTypeNumber && c.Name != "date" {
			return i
		}
	}
	return -1
}

func getColumnIndex(df *DataFrame, name string) int {
	for i, c := range df.Columns {
		if c.Name == name {
			return i
		}
	}
	return -1
}

func normalizeDate(date string) string {
	// Normalize ISO timestamps to YYYY-MM-DD so different sources align.
	if idx := strings.Index(date, "T"); idx >= 0 {
		return date[:idx]
	}
	return date
}

func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case string:
		f, err := strconv.ParseFloat(n, 64)
		return f, err == nil
	}
	return 0, false
}

// ---------- Expression AST ----------

type exprNode interface {
	eval(ctx *evalCtx) float64
	references() []variableRef
}

type numberNode struct {
	value float64
}

func (n *numberNode) eval(ctx *evalCtx) float64 { return n.value }
func (n *numberNode) references() []variableRef { return nil }

type refNode struct {
	ref variableRef
}

func (n *refNode) eval(ctx *evalCtx) float64 {
	v, ok := ctx.values[n.ref.key()][ctx.date]
	if !ok {
		return math.NaN()
	}
	return v
}

func (n *refNode) references() []variableRef { return []variableRef{n.ref} }

type binaryNode struct {
	op    rune
	left  exprNode
	right exprNode
}

func (n *binaryNode) eval(ctx *evalCtx) float64 {
	l := n.left.eval(ctx)
	r := n.right.eval(ctx)
	if math.IsNaN(l) || math.IsNaN(r) {
		return math.NaN()
	}
	switch n.op {
	case '+':
		return l + r
	case '-':
		return l - r
	case '*':
		return l * r
	case '/':
		if r == 0 {
			return math.NaN()
		}
		return l / r
	}
	return math.NaN()
}

func (n *binaryNode) references() []variableRef {
	return append(n.left.references(), n.right.references()...)
}

type unaryNode struct {
	child exprNode
}

func (n *unaryNode) eval(ctx *evalCtx) float64 {
	return -n.child.eval(ctx)
}

func (n *unaryNode) references() []variableRef {
	return n.child.references()
}

type evalCtx struct {
	date   string
	values map[string]map[string]float64
}

// ---------- Parser ----------

func parseExpression(s string) (exprNode, error) {
	tokens, err := tokenizeExpression(s)
	if err != nil {
		return nil, err
	}
	p := &exprParser{tokens: tokens}
	node, err := p.parseAddSub()
	if err != nil {
		return nil, err
	}
	if !p.eof() {
		return nil, fmt.Errorf("unexpected token after expression")
	}
	return node, nil
}

type exprToken struct {
	typ tokenType
	val string
	num float64
}

type tokenType int

const (
	tEOF tokenType = iota
	tNumber
	tIdent
	tLParen
	tRParen
	tPlus
	tMinus
	tMul
	tDiv
)

func tokenizeExpression(s string) ([]exprToken, error) {
	var tokens []exprToken
	i := 0
	for i < len(s) {
		c := s[i]
		switch c {
		case ' ', '\t', '\n', '\r':
			i++
		case '+':
			tokens = append(tokens, exprToken{typ: tPlus})
			i++
		case '-':
			tokens = append(tokens, exprToken{typ: tMinus})
			i++
		case '*':
			tokens = append(tokens, exprToken{typ: tMul})
			i++
		case '/':
			tokens = append(tokens, exprToken{typ: tDiv})
			i++
		case '(':
			tokens = append(tokens, exprToken{typ: tLParen})
			i++
		case ')':
			tokens = append(tokens, exprToken{typ: tRParen})
			i++
		default:
			if (c >= '0' && c <= '9') || c == '.' {
				start := i
				dotCount := 0
				for i < len(s) && ((s[i] >= '0' && s[i] <= '9') || s[i] == '.') {
					if s[i] == '.' {
						dotCount++
						if dotCount > 1 {
							return nil, fmt.Errorf("invalid number at position %d", start)
						}
					}
					i++
				}
				num, _ := strconv.ParseFloat(s[start:i], 64)
				tokens = append(tokens, exprToken{typ: tNumber, num: num})
			} else if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' {
				start := i
				for i < len(s) && ((s[i] >= 'a' && s[i] <= 'z') || (s[i] >= 'A' && s[i] <= 'Z') || (s[i] >= '0' && s[i] <= '9') || s[i] == '_' || s[i] == '.') {
					i++
				}
				tokens = append(tokens, exprToken{typ: tIdent, val: s[start:i]})
			} else {
				return nil, fmt.Errorf("invalid character '%c' at position %d", c, i)
			}
		}
	}
	tokens = append(tokens, exprToken{typ: tEOF})
	return tokens, nil
}

type exprParser struct {
	tokens []exprToken
	pos    int
}

func (p *exprParser) peek() exprToken {
	if p.pos < len(p.tokens) {
		return p.tokens[p.pos]
	}
	return exprToken{typ: tEOF}
}

func (p *exprParser) next() exprToken {
	t := p.peek()
	if p.pos < len(p.tokens) {
		p.pos++
	}
	return t
}

func (p *exprParser) eof() bool {
	return p.peek().typ == tEOF
}

func (p *exprParser) parseAddSub() (exprNode, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.typ != tPlus && t.typ != tMinus {
			break
		}
		p.next()
		right, err := p.parseMulDiv()
		if err != nil {
			return nil, err
		}
		op := '+'
		if t.typ == tMinus {
			op = '-'
		}
		left = &binaryNode{op: rune(op), left: left, right: right}
	}
	return left, nil
}

func (p *exprParser) parseMulDiv() (exprNode, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.typ != tMul && t.typ != tDiv {
			break
		}
		p.next()
		right, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		op := '*'
		if t.typ == tDiv {
			op = '/'
		}
		left = &binaryNode{op: rune(op), left: left, right: right}
	}
	return left, nil
}

func (p *exprParser) parseUnary() (exprNode, error) {
	t := p.peek()
	if t.typ == tMinus {
		p.next()
		child, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return &unaryNode{child: child}, nil
	}
	return p.parsePrimary()
}

func (p *exprParser) parsePrimary() (exprNode, error) {
	t := p.peek()
	switch t.typ {
	case tNumber:
		p.next()
		return &numberNode{value: t.num}, nil
	case tIdent:
		p.next()
		parts := strings.Split(t.val, ".")
		ref := variableRef{varName: parts[0]}
		if len(parts) > 2 {
			return nil, fmt.Errorf("invalid reference %q", t.val)
		}
		if len(parts) == 2 {
			ref.column = parts[1]
		}
		return &refNode{ref: ref}, nil
	case tLParen:
		p.next()
		node, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		if p.peek().typ != tRParen {
			return nil, fmt.Errorf("expected ')'")
		}
		p.next()
		return node, nil
	default:
		return nil, fmt.Errorf("unexpected token in expression")
	}
}

// extractInlineQueries finds compact query literals inside an expression string
// and replaces them with generated variable names. It returns the rewritten
// expression and a map of generated name -> compact query string.
//
// Example:
//   "price_history{symbol: AAPL} - formula{symbol: AAPL, expression: \"sma(20)\"}"
// becomes:
//   "__q0 - __q1"
// with map["__q0"] = "price_history{symbol: AAPL}"
func extractInlineQueries(expr string) (string, map[string]string, error) {
	vars := make(map[string]string)
	var out strings.Builder
	i := 0
	varCounter := 0

	for i < len(expr) {
		// Look for source name followed by '{'.
		if isWordChar(expr[i]) {
			j := i
			for j < len(expr) && isWordChar(expr[j]) {
				j++
			}
			k := skipCompactWhitespace(expr, j)
			if k < len(expr) && expr[k] == '{' {
				end := findMatchingBraceExpr(expr, k)
				if end > k {
					query := expr[i : end+1]
					name := fmt.Sprintf("__q%d", varCounter)
					varCounter++
					vars[name] = query
					out.WriteString(name)
					i = end + 1
					continue
				}
			}
		}
		out.WriteByte(expr[i])
		i++
	}

	return out.String(), vars, nil
}

func findMatchingBraceExpr(s string, openIdx int) int {
	depth := 1
	inQuote := byte(0)
	escaped := false
	for i := openIdx + 1; i < len(s); i++ {
		c := s[i]
		if escaped {
			escaped = false
			continue
		}
		if c == '\\' {
			escaped = true
			continue
		}
		if inQuote != 0 {
			if c == inQuote {
				inQuote = 0
			}
			continue
		}
		if c == '"' || c == '\'' {
			inQuote = c
			continue
		}
		if c == '{' {
			depth++
			continue
		}
		if c == '}' {
			depth--
			if depth == 0 {
				return i
			}
		}
	}
	return -1
}
