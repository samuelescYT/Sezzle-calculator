package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestApply(t *testing.T) {
	tests := []struct {
		name    string
		op      string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "add integers", op: "add", a: 2, b: 3, want: 5},
		{name: "add negatives", op: "add", a: -2.5, b: -1.5, want: -4},
		{name: "add floats", op: "add", a: 0.1, b: 0.2, want: 0.30000000000000004},
		{name: "add overflow", op: "add", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrOutOfRange},

		{name: "subtract", op: "subtract", a: 10, b: 4, want: 6},
		{name: "subtract to negative", op: "subtract", a: 4, b: 10, want: -6},
		{name: "subtract overflow", op: "subtract", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrOutOfRange},

		{name: "multiply", op: "multiply", a: 6, b: 7, want: 42},
		{name: "multiply by zero", op: "multiply", a: 123, b: 0, want: 0},
		{name: "multiply signs", op: "multiply", a: -3, b: 4, want: -12},
		{name: "multiply overflow", op: "multiply", a: 1e308, b: 10, wantErr: ErrOutOfRange},

		{name: "divide", op: "divide", a: 10, b: 4, want: 2.5},
		{name: "divide negative", op: "divide", a: -9, b: 3, want: -3},
		{name: "divide zero numerator", op: "divide", a: 0, b: 5, want: 0},
		{name: "divide by zero", op: "divide", a: 10, b: 0, wantErr: ErrDivisionByZero},
		{name: "divide zero by zero", op: "divide", a: 0, b: 0, wantErr: ErrDivisionByZero},
		{name: "divide overflow", op: "divide", a: 1e308, b: 1e-10, wantErr: ErrOutOfRange},

		{name: "power", op: "power", a: 2, b: 10, want: 1024},
		{name: "power zero exponent", op: "power", a: 5, b: 0, want: 1},
		{name: "power zero to zero", op: "power", a: 0, b: 0, want: 1},
		{name: "power negative exponent", op: "power", a: 2, b: -1, want: 0.5},
		{name: "power fractional exponent", op: "power", a: 9, b: 0.5, want: 3},
		{name: "power negative base integer exponent", op: "power", a: -2, b: 3, want: -8},
		{name: "power zero to negative", op: "power", a: 0, b: -1, wantErr: ErrDivisionByZero},
		{name: "power negative base fractional exponent", op: "power", a: -8, b: 1.0 / 3, wantErr: ErrUndefinedResult},
		{name: "power overflow", op: "power", a: 10, b: 400, wantErr: ErrOutOfRange},

		{name: "sqrt", op: "sqrt", a: 16, want: 4},
		{name: "sqrt zero", op: "sqrt", a: 0, want: 0},
		{name: "sqrt ignores b", op: "sqrt", a: 9, b: 100, want: 3},
		{name: "sqrt negative", op: "sqrt", a: -4, wantErr: ErrNegativeSqrt},

		{name: "percentage of base", op: "percentage", a: 30, b: 60, want: 18},
		{name: "percentage of one", op: "percentage", a: 30, b: 1, want: 0.3},
		{name: "percentage negative", op: "percentage", a: -10, b: 50, want: -5},
		{name: "percentage overflow", op: "percentage", a: math.MaxFloat64, b: 1000, wantErr: ErrOutOfRange},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op, ok := Lookup(tt.op)
			if !ok {
				t.Fatalf("Lookup(%q) not found", tt.op)
			}

			got, err := op.Apply(tt.a, tt.b)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Apply(%v, %v) error = %v, want %v", tt.a, tt.b, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Apply(%v, %v) unexpected error: %v", tt.a, tt.b, err)
			}
			if got != tt.want {
				t.Errorf("Apply(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestLookup(t *testing.T) {
	arities := map[string]int{
		"add":        2,
		"subtract":   2,
		"multiply":   2,
		"divide":     2,
		"power":      2,
		"sqrt":       1,
		"percentage": 2,
	}
	for name, arity := range arities {
		op, ok := Lookup(name)
		if !ok {
			t.Errorf("Lookup(%q) not found", name)
			continue
		}
		if op.Name != name || op.Arity != arity {
			t.Errorf("Lookup(%q) = {Name: %q, Arity: %d}, want {Name: %q, Arity: %d}", name, op.Name, op.Arity, name, arity)
		}
	}

	for _, name := range []string{"", "modulo", "Add", "ADD"} {
		if _, ok := Lookup(name); ok {
			t.Errorf("Lookup(%q) found, want not found", name)
		}
	}
}
