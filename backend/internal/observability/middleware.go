package observability

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RequestIDHeader carries the request ID in both directions, so a client or proxy can supply one
// and every response tells the caller which ID to quote when reporting a problem.
const RequestIDHeader = "X-Request-ID"

// validRequestID limits accepted incoming IDs so arbitrary header content never reaches the logs.
var validRequestID = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

func newRequestID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// RequestLogger assigns a request ID, stores a request-scoped logger in the context and logs one
// line per request with status, size and duration. 5xx responses are logged at error level.
func RequestLogger(base *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			id := r.Header.Get(RequestIDHeader)
			if !validRequestID.MatchString(id) {
				id = newRequestID()
			}
			w.Header().Set(RequestIDHeader, id)

			logger := base.With(slog.String("request_id", id))
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r.WithContext(WithLogger(r.Context(), logger)))

			status := ww.Status()
			if status == 0 {
				status = http.StatusOK
			}
			level := slog.LevelInfo
			if status >= 500 {
				level = slog.LevelError
			}
			logger.LogAttrs(r.Context(), level, "http request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("route", routePattern(r)),
				slog.Int("status", status),
				slog.Int("bytes", ww.BytesWritten()),
				slog.Float64("duration_ms", float64(time.Since(start).Microseconds())/1000),
				slog.String("remote_ip", r.RemoteAddr),
				slog.String("user_agent", r.UserAgent()),
			)
		})
	}
}

// Recoverer turns a panic into a JSON 500 response and logs it with a stack trace.
func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			rec := recover()
			if rec == nil {
				return
			}
			if rec == http.ErrAbortHandler {
				panic(rec) // deliberate abort: let net/http handle it silently
			}
			Logger(r.Context()).Error("panic recovered",
				slog.Any("panic", rec),
				slog.String("stack", string(debug.Stack())),
			)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":"Internal server error"}`))
		}()
		next.ServeHTTP(w, r)
	})
}

// routePattern returns the matched chi route (e.g. /api/items/{id}) so logs and metrics group
// requests by endpoint instead of by concrete URL.
func routePattern(r *http.Request) string {
	if rctx := chi.RouteContext(r.Context()); rctx != nil {
		if pattern := rctx.RoutePattern(); pattern != "" {
			return pattern
		}
	}
	return "unmatched"
}
