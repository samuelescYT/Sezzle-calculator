package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"

	"calculator/internal/calculator"
)

// maxBodyBytes caps request bodies; two numbers never need more than this.
const maxBodyBytes = 1 << 10

// calculateRequest holds the operands. Pointers distinguish a missing or null
// field from an explicit zero.
type calculateRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type calculateResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("operation")
	op, ok := calculator.Lookup(name)
	if !ok {
		writeError(w, &apiError{
			Status:  http.StatusNotFound,
			Code:    "UNKNOWN_OPERATION",
			Message: fmt.Sprintf("unknown operation %q", name),
		})
		return
	}

	var req calculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, err)
		return
	}

	a, b, err := operands(op, req)
	if err != nil {
		writeError(w, err)
		return
	}

	result, err := op.Apply(a, b)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Operation: op.Name, Result: result})
}

// operands validates the request against the operation's arity.
func operands(op calculator.Operation, req calculateRequest) (a, b float64, err error) {
	if req.A == nil {
		return 0, 0, invalidInput(`field "a" is required and must be a number`)
	}
	if op.Arity == 1 {
		if req.B != nil {
			return 0, 0, invalidInput(fmt.Sprintf(`operation %q takes a single operand; field "b" is not allowed`, op.Name))
		}
		return *req.A, 0, nil
	}
	if req.B == nil {
		return 0, 0, invalidInput(`field "b" is required and must be a number`)
	}
	return *req.A, *req.B, nil
}

// decodeJSON strictly decodes a single JSON object from the request body into dst.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return &apiError{
			Status:  http.StatusUnsupportedMediaType,
			Code:    "UNSUPPORTED_MEDIA_TYPE",
			Message: "Content-Type must be application/json",
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return decodeError(err)
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
			return decodeError(err)
		}
		return invalidJSON("request body must contain a single JSON object")
	}
	return nil
}

// decodeError turns encoding/json errors into client-friendly messages
// without exposing Go type names.
func decodeError(err error) *apiError {
	if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
		return &apiError{
			Status:  http.StatusRequestEntityTooLarge,
			Code:    "PAYLOAD_TOO_LARGE",
			Message: fmt.Sprintf("request body must not exceed %d bytes", maxBodyBytes),
		}
	}
	if typeErr, ok := errors.AsType[*json.UnmarshalTypeError](err); ok {
		if typeErr.Field == "" {
			return invalidJSON("request body must be a JSON object")
		}
		return invalidJSON(fmt.Sprintf("field %q must be a valid number", typeErr.Field))
	}
	if field, ok := strings.CutPrefix(err.Error(), "json: unknown field "); ok {
		return invalidJSON("unknown field " + field)
	}
	if errors.Is(err, io.EOF) {
		return invalidJSON("request body must not be empty")
	}
	return invalidJSON("request body is not valid JSON")
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
