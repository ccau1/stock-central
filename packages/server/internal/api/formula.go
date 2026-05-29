package api

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"stockcentral/internal/client"
)

// ---------- Formula Parser ----------
// Supports expressions like:
//   close() + sma(20)
//   rsi(14) - macd(12,26,9)
//   (bb_upper(20,2) - bb_lower(20,2)) / bb_middle(20)
// Available functions:
//   Price: close(), open(), high(), low(), volume(), hl2(), hlc3(), ohlc4()
//   Moving Averages: sma(period), ema(period), wma(period), hma(period), vwma(period)
//   Oscillators: rsi(period), macd(f,s,sg), macd_signal(f,s,sg), macd_hist(f,s,sg)
//                stoch_k(period), stoch_d(period,smooth_k), williams_r(period)
//                cci(period), mfi(period)
//   Bollinger Bands: bb_upper(period,mult), bb_middle(period), bb_lower(period,mult)
//   Volatility: atr(period), stddev(period), tr()
//   Volume: obv()
//   Operators: + - * / parentheses unary minus

type tokenType int

const (
	tokenEOF tokenType = iota
	tokenNumber
	tokenIdent
	tokenLParen
	tokenRParen
	tokenComma
	tokenPlus
	tokenMinus
	tokenMul
	tokenDiv
)

type token struct {
	typ tokenType
	val string
	num float64
}

func tokenizeFormula(formula string) ([]token, error) {
	var tokens []token
	i := 0
	for i < len(formula) {
		c := formula[i]
		switch c {
		case ' ', '\t', '\n', '\r':
			i++
		case '+':
			tokens = append(tokens, token{typ: tokenPlus})
			i++
		case '-':
			tokens = append(tokens, token{typ: tokenMinus})
			i++
		case '*':
			tokens = append(tokens, token{typ: tokenMul})
			i++
		case '/':
			tokens = append(tokens, token{typ: tokenDiv})
			i++
		case '(':
			tokens = append(tokens, token{typ: tokenLParen})
			i++
		case ')':
			tokens = append(tokens, token{typ: tokenRParen})
			i++
		case ',':
			tokens = append(tokens, token{typ: tokenComma})
			i++
		default:
			if (c >= '0' && c <= '9') || c == '.' {
				start := i
				dotCount := 0
				for i < len(formula) && ((formula[i] >= '0' && formula[i] <= '9') || formula[i] == '.') {
					if formula[i] == '.' {
						dotCount++
						if dotCount > 1 {
							return nil, fmt.Errorf("invalid number at position %d", start)
						}
					}
					i++
				}
				num, _ := strconv.ParseFloat(formula[start:i], 64)
				tokens = append(tokens, token{typ: tokenNumber, num: num})
			} else if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' {
				start := i
				for i < len(formula) && ((formula[i] >= 'a' && formula[i] <= 'z') || (formula[i] >= 'A' && formula[i] <= 'Z') || (formula[i] >= '0' && formula[i] <= '9') || formula[i] == '_') {
					i++
				}
				tokens = append(tokens, token{typ: tokenIdent, val: strings.ToLower(formula[start:i])})
			} else {
				return nil, fmt.Errorf("invalid character '%c' at position %d", c, i)
			}
		}
	}
	tokens = append(tokens, token{typ: tokenEOF})
	return tokens, nil
}

// ---------- AST ----------

type formulaNode interface {
	eval(idx int, ctx *formulaEvalCtx) float64
	cacheKey() string
}

type numberNode struct {
	value float64
}

func (n *numberNode) eval(idx int, ctx *formulaEvalCtx) float64 {
	return n.value
}

func (n *numberNode) cacheKey() string {
	return fmt.Sprintf("num_%g", n.value)
}

type callNode struct {
	name string
	args []formulaNode
}

func (n *callNode) eval(idx int, ctx *formulaEvalCtx) float64 {
	switch n.name {
	case "close":
		if idx < len(ctx.candles) {
			return ctx.candles[idx].Close
		}
	case "open":
		if idx < len(ctx.candles) {
			return ctx.candles[idx].Open
		}
	case "high":
		if idx < len(ctx.candles) {
			return ctx.candles[idx].High
		}
	case "low":
		if idx < len(ctx.candles) {
			return ctx.candles[idx].Low
		}
	case "volume":
		if idx < len(ctx.candles) {
			return float64(ctx.candles[idx].Volume)
		}
	case "hl2":
		if idx < len(ctx.candles) {
			return (ctx.candles[idx].High + ctx.candles[idx].Low) / 2
		}
	case "hlc3":
		if idx < len(ctx.candles) {
			return (ctx.candles[idx].High + ctx.candles[idx].Low + ctx.candles[idx].Close) / 3
		}
	case "ohlc4":
		if idx < len(ctx.candles) {
			return (ctx.candles[idx].Open + ctx.candles[idx].High + ctx.candles[idx].Low + ctx.candles[idx].Close) / 4
		}
	case "sma":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeSMASeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "ema":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeEMASeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "rsi":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeRSISeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "macd":
		fast := int(n.argValue(0, idx, ctx))
		slow := int(n.argValue(1, idx, ctx))
		sig := int(n.argValue(2, idx, ctx))
		if fast > 0 && slow > 0 && sig > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				line, _, _ := computeMACDSeries(ctx.candles, fast, slow, sig)
				return alignIndicatorToCandles(line.Points, ctx.candles)
			})
		}
	case "macd_signal":
		fast := int(n.argValue(0, idx, ctx))
		slow := int(n.argValue(1, idx, ctx))
		sig := int(n.argValue(2, idx, ctx))
		if fast > 0 && slow > 0 && sig > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				_, signalLine, _ := computeMACDSeries(ctx.candles, fast, slow, sig)
				return alignIndicatorToCandles(signalLine.Points, ctx.candles)
			})
		}
	case "macd_hist":
		fast := int(n.argValue(0, idx, ctx))
		slow := int(n.argValue(1, idx, ctx))
		sig := int(n.argValue(2, idx, ctx))
		if fast > 0 && slow > 0 && sig > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				_, _, hist := computeMACDSeries(ctx.candles, fast, slow, sig)
				return alignIndicatorToCandles(hist.Points, ctx.candles)
			})
		}
	case "bb_upper":
		period := int(n.argValue(0, idx, ctx))
		mult := n.argValue(1, idx, ctx)
		if period > 0 && mult > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				upper, _, _ := computeBollingerSeries(ctx.candles, period, mult)
				return alignIndicatorToCandles(upper.Points, ctx.candles)
			})
		}
	case "bb_middle":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				_, mid, _ := computeBollingerSeries(ctx.candles, period, 2)
				return alignIndicatorToCandles(mid.Points, ctx.candles)
			})
		}
	case "bb_lower":
		period := int(n.argValue(0, idx, ctx))
		mult := n.argValue(1, idx, ctx)
		if period > 0 && mult > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				_, _, lower := computeBollingerSeries(ctx.candles, period, mult)
				return alignIndicatorToCandles(lower.Points, ctx.candles)
			})
		}
	case "wma":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeWMASeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "hma":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeHMASeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "vwma":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeVWMASeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "atr":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeATRSeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "stddev":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeStdDevSeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "cci":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeCCISeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "stoch_k":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeStochKSeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "stoch_d":
		period := int(n.argValue(0, idx, ctx))
		smoothK := int(n.argValue(1, idx, ctx))
		if period > 0 && smoothK > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeStochDSeries(ctx.candles, period, smoothK).Points, ctx.candles)
			})
		}
	case "williams_r":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeWilliamsRSeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "mfi":
		period := int(n.argValue(0, idx, ctx))
		if period > 0 {
			return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
				return alignIndicatorToCandles(computeMFISeries(ctx.candles, period).Points, ctx.candles)
			})
		}
	case "obv":
		return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
			return alignIndicatorToCandles(computeOBVSeries(ctx.candles).Points, ctx.candles)
		})
	case "tr":
		return ctx.getIndicatorValue(n.cacheKey(), idx, func() []float64 {
			return alignIndicatorToCandles(computeTRSeries(ctx.candles).Points, ctx.candles)
		})
	}
	return math.NaN()
}

func (n *callNode) argValue(i, idx int, ctx *formulaEvalCtx) float64 {
	if i < len(n.args) {
		return n.args[i].eval(idx, ctx)
	}
	return 0
}

func (n *callNode) cacheKey() string {
	var parts []string
	parts = append(parts, n.name)
	for _, arg := range n.args {
		if num, ok := arg.(*numberNode); ok {
			parts = append(parts, fmt.Sprintf("%g", num.value))
		} else {
			parts = append(parts, "expr")
		}
	}
	return strings.Join(parts, "_")
}

type binaryNode struct {
	op    rune
	left  formulaNode
	right formulaNode
}

func (n *binaryNode) eval(idx int, ctx *formulaEvalCtx) float64 {
	left := n.left.eval(idx, ctx)
	right := n.right.eval(idx, ctx)
	switch n.op {
	case '+':
		return left + right
	case '-':
		return left - right
	case '*':
		return left * right
	case '/':
		if right == 0 {
			return math.NaN()
		}
		return left / right
	}
	return math.NaN()
}

func (n *binaryNode) cacheKey() string {
	return fmt.Sprintf("(%s%c%s)", n.left.cacheKey(), n.op, n.right.cacheKey())
}

// ---------- Parser ----------

type formulaParser struct {
	tokens []token
	pos    int
}

func (p *formulaParser) peek() token {
	if p.pos < len(p.tokens) {
		return p.tokens[p.pos]
	}
	return token{typ: tokenEOF}
}

func (p *formulaParser) next() token {
	t := p.peek()
	if p.pos < len(p.tokens) {
		p.pos++
	}
	return t
}

func (p *formulaParser) expect(tt tokenType) (token, error) {
	t := p.next()
	if t.typ != tt {
		return t, fmt.Errorf("expected token %v, got %v", tt, t.typ)
	}
	return t, nil
}

func (p *formulaParser) parse() (formulaNode, error) {
	return p.parseAddSub()
}

func (p *formulaParser) parseAddSub() (formulaNode, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.typ != tokenPlus && t.typ != tokenMinus {
			break
		}
		p.next()
		right, err := p.parseMulDiv()
		if err != nil {
			return nil, err
		}
		op := '+'
		if t.typ == tokenMinus {
			op = '-'
		}
		left = &binaryNode{op: op, left: left, right: right}
	}
	return left, nil
}

func (p *formulaParser) parseMulDiv() (formulaNode, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.typ != tokenMul && t.typ != tokenDiv {
			break
		}
		p.next()
		right, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		op := '*'
		if t.typ == tokenDiv {
			op = '/'
		}
		left = &binaryNode{op: op, left: left, right: right}
	}
	return left, nil
}

func (p *formulaParser) parseUnary() (formulaNode, error) {
	t := p.peek()
	if t.typ == tokenMinus {
		p.next()
		expr, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return &binaryNode{op: '*', left: &numberNode{value: -1}, right: expr}, nil
	}
	return p.parsePrimary()
}

func (p *formulaParser) parsePrimary() (formulaNode, error) {
	t := p.peek()
	switch t.typ {
	case tokenNumber:
		p.next()
		return &numberNode{value: t.num}, nil
	case tokenIdent:
		p.next()
		if p.peek().typ != tokenLParen {
			return nil, fmt.Errorf("expected '(' after function name '%s'", t.val)
		}
		p.next() // consume '('
		var args []formulaNode
		if p.peek().typ != tokenRParen {
			for {
				arg, err := p.parseAddSub()
				if err != nil {
					return nil, err
				}
				args = append(args, arg)
				if p.peek().typ == tokenComma {
					p.next()
					continue
				}
				break
			}
		}
		if _, err := p.expect(tokenRParen); err != nil {
			return nil, err
		}
		return &callNode{name: t.val, args: args}, nil
	case tokenLParen:
		p.next()
		expr, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(tokenRParen); err != nil {
			return nil, err
		}
		return expr, nil
	default:
		return nil, fmt.Errorf("unexpected token in expression at position %d", p.pos)
	}
}

// ---------- Eval Context ----------

type formulaEvalCtx struct {
	candles []client.Candle
	cache   map[string][]float64
}

func (ctx *formulaEvalCtx) getIndicatorValue(cacheKey string, idx int, compute func() []float64) float64 {
	series, ok := ctx.cache[cacheKey]
	if !ok {
		series = compute()
		ctx.cache[cacheKey] = series
	}
	if idx >= 0 && idx < len(series) {
		return series[idx]
	}
	return math.NaN()
}

func alignIndicatorToCandles(points []IndicatorPoint, candles []client.Candle) []float64 {
	valMap := make(map[string]float64)
	for _, p := range points {
		valMap[p.Date] = p.Value
	}
	values := make([]float64, len(candles))
	for i, c := range candles {
		if v, ok := valMap[c.Date]; ok {
			values[i] = v
		} else {
			values[i] = math.NaN()
		}
	}
	return values
}

func evaluateFormulaExpression(candles []client.Candle, formula string) ([]IndicatorPoint, error) {
	tokens, err := tokenizeFormula(formula)
	if err != nil {
		return nil, err
	}
	parser := &formulaParser{tokens: tokens}
	ast, err := parser.parse()
	if err != nil {
		return nil, err
	}
	if parser.peek().typ != tokenEOF {
		return nil, fmt.Errorf("unexpected token after end of expression")
	}

	ctx := &formulaEvalCtx{
		candles: candles,
		cache:   make(map[string][]float64),
	}

	var points []IndicatorPoint
	for i := range candles {
		val := ast.eval(i, ctx)
		if !math.IsNaN(val) {
			points = append(points, IndicatorPoint{
				Date:  candles[i].Date,
				Value: math.Round(val*100) / 100,
			})
		}
	}
	return points, nil
}
