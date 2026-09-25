package api

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRecoverPanics(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	handler := recoverPanics(logger, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	assertError(t, rec, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
	if !strings.Contains(logs.String(), "panic=boom") {
		t.Errorf("panic was not logged; logs = %q", logs.String())
	}
}

func TestRecoverPanicsRepanicsOnAbort(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := recoverPanics(logger, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		if v := recover(); v != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler", v)
		}
	}()
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}

func TestLogRequests(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	handler := logRequests(logger, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))

	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/v1/calculate/add", nil))

	for _, want := range []string{"method=POST", "path=/api/v1/calculate/add", "status=418", "duration="} {
		if !strings.Contains(logs.String(), want) {
			t.Errorf("log line missing %q; logs = %q", want, logs.String())
		}
	}
}

func TestLogRequestsDefaultsToOK(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	handler := logRequests(logger, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))

	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))

	if !strings.Contains(logs.String(), "status=200") {
		t.Errorf("log line missing status=200; logs = %q", logs.String())
	}
}
