package api

import (
	"errors"
	"net/http"

	"calculator/internal/calculator"
)

// apiError is an error that knows how it should be rendered over HTTP.
type apiError struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *apiError) Error() string { return e.Message }

// errorResponse is the envelope every error response is wrapped in.
type errorResponse struct {
	Error *apiError `json:"error"`
}

var errInternal = &apiError{
	Status:  http.StatusInternalServerError,
	Code:    "INTERNAL_ERROR",
	Message: "internal server error",
}

func invalidJSON(message string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: "INVALID_JSON", Message: message}
}

func invalidInput(message string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: "INVALID_INPUT", Message: message}
}

// domainErrors maps calculator errors to their HTTP representation.
// Math errors are 422: the request is well-formed but cannot be computed.
var domainErrors = []struct {
	err  error
	code string
}{
	{calculator.ErrDivisionByZero, "DIVISION_BY_ZERO"},
	{calculator.ErrNegativeSqrt, "NEGATIVE_SQUARE_ROOT"},
	{calculator.ErrUndefinedResult, "UNDEFINED_RESULT"},
	{calculator.ErrOutOfRange, "RESULT_OUT_OF_RANGE"},
}

// toAPIError converts any error into an apiError. Unknown errors become a
// generic 500 so internal details are never leaked to clients.
func toAPIError(err error) *apiError {
	if apiErr, ok := errors.AsType[*apiError](err); ok {
		return apiErr
	}
	for _, d := range domainErrors {
		if errors.Is(err, d.err) {
			return &apiError{Status: http.StatusUnprocessableEntity, Code: d.code, Message: err.Error()}
		}
	}
	return errInternal
}

func writeError(w http.ResponseWriter, err error) {
	apiErr := toAPIError(err)
	writeJSON(w, apiErr.Status, errorResponse{Error: apiErr})
}
