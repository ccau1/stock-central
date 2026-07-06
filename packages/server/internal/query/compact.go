package query

import (
	"fmt"
	"strconv"
	"strings"
)

// parseCompactQuery parses a compact Grafana-style query string on the server.
//
//   price_history{symbol: AAPL, range: 1y, close_only: true}
//   metric{symbol: AAPL, metric: pe_forward}
//   formula{symbol: AAPL, expression: "sma(20, close()) / sma(50, close())"}
//
// This mirrors the frontend compact parser so the server can also understand
// compact strings, e.g. inside expression variable values.
func parseCompactQuery(input string) (Spec, error) {
	trimmed := strings.TrimSpace(input)
	source, body, err := splitSourceAndBody(trimmed)
	if err != nil {
		return Spec{}, err
	}
	params, err := parseCompactBody(body)
	if err != nil {
		return Spec{}, err
	}
	return Spec{Source: source, Params: params}, nil
}

func splitSourceAndBody(input string) (string, string, error) {
	braceIdx := strings.IndexByte(input, '{')
	if braceIdx < 0 {
		return "", "", fmt.Errorf("invalid compact query: %q", input)
	}
	if !strings.HasSuffix(input, "}") {
		return "", "", fmt.Errorf("unmatched '{' in compact query: %q", input)
	}
	return strings.TrimSpace(input[:braceIdx]), input[braceIdx+1 : len(input)-1], nil
}

func parseCompactBody(body string) (map[string]interface{}, error) {
	params := make(map[string]interface{})
	i := 0
	for i < len(body) {
		i = skipCompactWhitespace(body, i)
		if i >= len(body) {
			break
		}

		keyEnd := i
		for keyEnd < len(body) && (isWordChar(body[keyEnd])) {
			keyEnd++
		}
		key := strings.TrimSpace(body[i:keyEnd])
		if key == "" {
			return nil, fmt.Errorf("expected parameter key at position %d", i)
		}
		i = keyEnd

		i = skipCompactWhitespace(body, i)
		if i >= len(body) || body[i] != ':' {
			return nil, fmt.Errorf("expected ':' after key %q", key)
		}
		i++

		i = skipCompactWhitespace(body, i)
		value, nextIdx, err := readCompactValue(body, i)
		if err != nil {
			return nil, err
		}
		params[key] = value
		i = nextIdx

		i = skipCompactWhitespace(body, i)
		if i < len(body) && body[i] == ',' {
			i++
		}
	}
	return params, nil
}

func skipCompactWhitespace(s string, i int) int {
	for i < len(s) && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') {
		i++
	}
	return i
}

func isWordChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_'
}

func readCompactValue(s string, i int) (interface{}, int, error) {
	if i >= len(s) {
		return nil, i, fmt.Errorf("expected value")
	}
	if s[i] == '"' || s[i] == '\'' {
		return readCompactQuoted(s, i, s[i])
	}

	// Read until top-level comma or closing brace.
	depth := 0
	j := i
	for j < len(s) {
		c := s[j]
		if c == '(' {
			depth++
			j++
			continue
		}
		if c == ')' {
			depth--
			j++
			continue
		}
		if c == ',' && depth == 0 {
			break
		}
		if c == '}' && depth == 0 {
			break
		}
		j++
	}

	raw := strings.TrimSpace(s[i:j])
	return coerceCompactValue(raw), j, nil
}

func readCompactQuoted(s string, i int, quote byte) (string, int, error) {
	j := i + 1
	escaped := false
	var value strings.Builder
	for j < len(s) {
		c := s[j]
		if escaped {
			value.WriteByte(c)
			escaped = false
			j++
			continue
		}
		if c == '\\' {
			escaped = true
			j++
			continue
		}
		if c == quote {
			j++
			return value.String(), j, nil
		}
		value.WriteByte(c)
		j++
	}
	return "", j, fmt.Errorf("unterminated string starting at position %d", i)
}

func coerceCompactValue(raw string) interface{} {
	if raw == "true" {
		return true
	}
	if raw == "false" {
		return false
	}
	if n, err := strconv.ParseFloat(raw, 64); err == nil {
		return n
	}
	return raw
}

func isCompactQueryString(value string) bool {
	trimmed := strings.TrimSpace(value)
	braceIdx := strings.IndexByte(trimmed, '{')
	if braceIdx <= 0 {
		return false
	}
	for i := 0; i < braceIdx; i++ {
		if !isWordChar(trimmed[i]) {
			return false
		}
	}
	return strings.HasSuffix(trimmed, "}")
}
