// Package observability provides structured logging (slog), request tracing and Prometheus metrics.
package observability

import (
	"context"
	"io"
	"log/slog"
)

type loggerKey struct{}

// NewLogger returns a slog.Logger writing to w in "json" or "text" format.
func NewLogger(w io.Writer, format string, level slog.Level) *slog.Logger {
	opts := &slog.HandlerOptions{Level: level}
	if format == "json" {
		return slog.New(slog.NewJSONHandler(w, opts))
	}
	return slog.New(slog.NewTextHandler(w, opts))
}

// WithLogger returns a context carrying logger.
func WithLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey{}, logger)
}

// Logger returns the request-scoped logger stored in ctx (it carries the request ID),
// falling back to slog.Default().
func Logger(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}
