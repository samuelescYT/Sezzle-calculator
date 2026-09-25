package api

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"calculator/internal/calculator"
)

func TestToAPIError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"api error passes through", invalidInput("bad"), http.StatusBadRequest, "INVALID_INPUT"},
		{"wrapped domain error", fmt.Errorf("dividing: %w", calculator.ErrDivisionByZero), http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"},
		{"unknown error is hidden", errors.New("database password leaked"), http.StatusInternalServerError, "INTERNAL_ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toAPIError(tt.err)
			if got.Status != tt.wantStatus || got.Code != tt.wantCode {
				t.Errorf("toAPIError(%v) = {%d, %q}, want {%d, %q}", tt.err, got.Status, got.Code, tt.wantStatus, tt.wantCode)
			}
		})
	}
}

func TestAPIErrorMessage(t *testing.T) {
	if got := invalidJSON("oops").Error(); got != "oops" {
		t.Errorf("Error() = %q, want %q", got, "oops")
	}
}
