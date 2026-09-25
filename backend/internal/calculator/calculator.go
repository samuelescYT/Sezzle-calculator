// Package calculator implements the arithmetic operations exposed by the API.
//
// It is pure domain logic with no knowledge of HTTP: every operation either
// returns a finite result or a domain error that callers can match with
// errors.Is.
package calculator

import (
	"errors"
	"math"
)

// Domain errors returned by Operation.Apply.
var (
	ErrDivisionByZero  = errors.New("division by zero is undefined")
	ErrNegativeSqrt    = errors.New("square root of a negative number is undefined")
	ErrUndefinedResult = errors.New("result is undefined")
	ErrOutOfRange      = errors.New("result is out of range")
)

// Operation is a named arithmetic operation taking one or two operands.
type Operation struct {
	Name  string
	Arity int
	fn    func(a, b float64) (float64, error)
}

// Apply runs the operation. Unary operations ignore b.
//
// Results that are not finite numbers are reported as errors, since NaN and
// ±Inf are not meaningful calculator outputs and cannot be encoded as JSON.
func (o Operation) Apply(a, b float64) (float64, error) {
	result, err := o.fn(a, b)
	if err != nil {
		return 0, err
	}
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrOutOfRange
	}
	return result, nil
}

// operations holds every supported operation, keyed by name.
// Adding an operation only requires a new entry here.
var operations = index(
	Operation{Name: "add", Arity: 2, fn: add},
	Operation{Name: "subtract", Arity: 2, fn: subtract},
	Operation{Name: "multiply", Arity: 2, fn: multiply},
	Operation{Name: "divide", Arity: 2, fn: divide},
	Operation{Name: "power", Arity: 2, fn: power},
	Operation{Name: "sqrt", Arity: 1, fn: sqrt},
	Operation{Name: "percentage", Arity: 2, fn: percentage},
)

// Lookup returns the operation registered under name.
func Lookup(name string) (Operation, bool) {
	op, ok := operations[name]
	return op, ok
}

func index(ops ...Operation) map[string]Operation {
	m := make(map[string]Operation, len(ops))
	for _, op := range ops {
		m[op.Name] = op
	}
	return m
}

func add(a, b float64) (float64, error)      { return a + b, nil }
func subtract(a, b float64) (float64, error) { return a - b, nil }
func multiply(a, b float64) (float64, error) { return a * b, nil }

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

func power(a, b float64) (float64, error) {
	if a == 0 && b < 0 {
		// 0^-n is 1/0^n.
		return 0, ErrDivisionByZero
	}
	return math.Pow(a, b), nil
}

func sqrt(a, _ float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(a), nil
}

// percentage returns a percent of b, e.g. percentage(30, 60) = 18.
func percentage(a, b float64) (float64, error) {
	return a * b / 100, nil
}
