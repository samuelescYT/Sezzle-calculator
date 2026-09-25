package api

import (
	"log/slog"
	"net/http"
	"time"
)

// statusRecorder captures the status code written by the wrapped handler.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// logRequests logs one structured line per request.
func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration", time.Since(start),
		)
	})
}

// recoverPanics turns a panic in a handler into a JSON 500 instead of a
// dropped connection.
func recoverPanics(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			v := recover()
			if v == nil {
				return
			}
			if v == http.ErrAbortHandler {
				// Deliberate abort: let net/http handle it.
				panic(v)
			}
			logger.Error("panic recovered", "panic", v, "method", r.Method, "path", r.URL.Path)
			writeError(w, errInternal)
		}()
		next.ServeHTTP(w, r)
	})
}
