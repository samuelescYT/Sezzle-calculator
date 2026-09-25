package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	newTestRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != jsonType {
		t.Errorf("Content-Type = %q, want %q", got, jsonType)
	}
	if got, want := rec.Body.String(), "{\"status\":\"ok\"}\n"; got != want {
		t.Errorf("body = %q, want %q", got, want)
	}
}

func TestRouting(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
		want   int
	}{
		{"calculate requires POST", http.MethodGet, "/api/v1/calculate/add", http.StatusMethodNotAllowed},
		{"health requires GET", http.MethodPost, "/api/v1/health", http.StatusMethodNotAllowed},
		{"missing operation", http.MethodPost, "/api/v1/calculate/", http.StatusNotFound},
		{"unknown route", http.MethodGet, "/api/v2/health", http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rec := httptest.NewRecorder()
			newTestRouter().ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Errorf("%s %s status = %d, want %d", tt.method, tt.path, rec.Code, tt.want)
			}
		})
	}
}
