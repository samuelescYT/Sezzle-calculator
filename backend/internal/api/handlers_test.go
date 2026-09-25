package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const jsonType = "application/json"

func newTestRouter() http.Handler {
	return NewRouter(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func post(t *testing.T, path, contentType, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, req)
	return rec
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		operation string
		body      string
		want      string
	}{
		{"add", `{"a": 2, "b": 3}`, `{"operation":"add","result":5}`},
		{"subtract", `{"a": 4, "b": 10}`, `{"operation":"subtract","result":-6}`},
		{"multiply", `{"a": 1.5, "b": -4}`, `{"operation":"multiply","result":-6}`},
		{"divide", `{"a": 10, "b": 4}`, `{"operation":"divide","result":2.5}`},
		{"power", `{"a": 2, "b": 10}`, `{"operation":"power","result":1024}`},
		{"sqrt", `{"a": 9}`, `{"operation":"sqrt","result":3}`},
		{"percentage", `{"a": 30, "b": 60}`, `{"operation":"percentage","result":18}`},
		{"add", `{"a": 0, "b": 0}`, `{"operation":"add","result":0}`},
		{"add", `{"a": 1e3, "b": 1}`, `{"operation":"add","result":1001}`},
	}

	for _, tt := range tests {
		t.Run(tt.operation+" "+tt.body, func(t *testing.T) {
			rec := post(t, "/api/v1/calculate/"+tt.operation, jsonType, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusOK, rec.Body)
			}
			if got := rec.Header().Get("Content-Type"); got != jsonType {
				t.Errorf("Content-Type = %q, want %q", got, jsonType)
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tt.want {
				t.Errorf("body = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestCalculateAcceptsJSONWithCharset(t *testing.T) {
	rec := post(t, "/api/v1/calculate/add", "application/json; charset=utf-8", `{"a": 1, "b": 2}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", rec.Code, http.StatusOK, rec.Body)
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name        string
		operation   string
		contentType string
		body        string
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		// Domain errors.
		{"divide by zero", "divide", jsonType, `{"a": 10, "b": 0}`, 422, "DIVISION_BY_ZERO", "division by zero is undefined"},
		{"zero to negative power", "power", jsonType, `{"a": 0, "b": -1}`, 422, "DIVISION_BY_ZERO", "division by zero is undefined"},
		{"negative sqrt", "sqrt", jsonType, `{"a": -4}`, 422, "NEGATIVE_SQUARE_ROOT", "square root of a negative number is undefined"},
		{"undefined power", "power", jsonType, `{"a": -8, "b": 0.3333333333333333}`, 422, "UNDEFINED_RESULT", "result is undefined"},
		{"overflow", "multiply", jsonType, `{"a": 1e308, "b": 10}`, 422, "RESULT_OUT_OF_RANGE", "result is out of range"},

		// Unknown operation.
		{"unknown operation", "modulo", jsonType, `{"a": 1, "b": 2}`, 404, "UNKNOWN_OPERATION", `unknown operation "modulo"`},
		{"operation is case sensitive", "Add", jsonType, `{"a": 1, "b": 2}`, 404, "UNKNOWN_OPERATION", `unknown operation "Add"`},

		// Invalid operands.
		{"missing a", "add", jsonType, `{"b": 2}`, 400, "INVALID_INPUT", `field "a" is required and must be a number`},
		{"missing b", "add", jsonType, `{"a": 1}`, 400, "INVALID_INPUT", `field "b" is required and must be a number`},
		{"null a", "add", jsonType, `{"a": null, "b": 2}`, 400, "INVALID_INPUT", `field "a" is required and must be a number`},
		{"null b", "divide", jsonType, `{"a": 1, "b": null}`, 400, "INVALID_INPUT", `field "b" is required and must be a number`},
		{"empty object", "add", jsonType, `{}`, 400, "INVALID_INPUT", `field "a" is required and must be a number`},
		{"b on unary operation", "sqrt", jsonType, `{"a": 9, "b": 2}`, 400, "INVALID_INPUT", `operation "sqrt" takes a single operand; field "b" is not allowed`},

		// Invalid JSON.
		{"string operand", "add", jsonType, `{"a": "1", "b": 2}`, 400, "INVALID_JSON", `field "a" must be a valid number`},
		{"boolean operand", "add", jsonType, `{"a": 1, "b": true}`, 400, "INVALID_JSON", `field "b" must be a valid number`},
		{"number out of range", "add", jsonType, `{"a": 1e400, "b": 1}`, 400, "INVALID_JSON", `field "a" must be a valid number`},
		{"array body", "add", jsonType, `[1, 2]`, 400, "INVALID_JSON", "request body must be a JSON object"},
		{"unknown field", "add", jsonType, `{"a": 1, "b": 2, "c": 3}`, 400, "INVALID_JSON", `unknown field "c"`},
		{"malformed", "add", jsonType, `{"a": 1,`, 400, "INVALID_JSON", "request body is not valid JSON"},
		{"not json", "add", jsonType, `a=1&b=2`, 400, "INVALID_JSON", "request body is not valid JSON"},
		{"empty body", "add", jsonType, ``, 400, "INVALID_JSON", "request body must not be empty"},
		{"trailing data", "add", jsonType, `{"a": 1, "b": 2}{"a": 3}`, 400, "INVALID_JSON", "request body must contain a single JSON object"},
		{"trailing garbage", "add", jsonType, `{"a": 1, "b": 2} x`, 400, "INVALID_JSON", "request body must contain a single JSON object"},

		// Transport errors.
		{"missing content type", "add", "", `{"a": 1, "b": 2}`, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json"},
		{"wrong content type", "add", "text/plain", `{"a": 1, "b": 2}`, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json"},
		{"body too large", "add", jsonType, `{"a": 1` + strings.Repeat(" ", maxBodyBytes) + `, "b": 2}`, 413, "PAYLOAD_TOO_LARGE", "request body must not exceed 1024 bytes"},
		{"trailing data too large", "add", jsonType, `{"a": 1, "b": 2}` + strings.Repeat(" ", maxBodyBytes), 413, "PAYLOAD_TOO_LARGE", "request body must not exceed 1024 bytes"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := post(t, "/api/v1/calculate/"+tt.operation, tt.contentType, tt.body)
			assertError(t, rec, tt.wantStatus, tt.wantCode, tt.wantMessage)
		})
	}
}

func assertError(t *testing.T, rec *httptest.ResponseRecorder, status int, code, message string) {
	t.Helper()
	if rec.Code != status {
		t.Errorf("status = %d, want %d", rec.Code, status)
	}
	if got := rec.Header().Get("Content-Type"); got != jsonType {
		t.Errorf("Content-Type = %q, want %q", got, jsonType)
	}
	var body errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error == nil {
		t.Fatalf("body is not an error envelope: %s", rec.Body)
	}
	if body.Error.Code != code {
		t.Errorf("code = %q, want %q", body.Error.Code, code)
	}
	if body.Error.Message != message {
		t.Errorf("message = %q, want %q", body.Error.Message, message)
	}
}
