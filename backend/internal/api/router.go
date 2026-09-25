// Package api exposes the calculator over HTTP.
package api

import (
	"log/slog"
	"net/http"
)

// NewRouter returns the HTTP handler exposing the calculator API.
func NewRouter(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", handleHealth)
	mux.HandleFunc("POST /api/v1/calculate/{operation}", handleCalculate)
	return logRequests(logger, recoverPanics(logger, mux))
}
