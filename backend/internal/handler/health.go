package handler

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"lost-and-found/backend/internal/observability"
)

// Pinger is a dependency that can report whether it is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// HealthHandler serves liveness and readiness checks.
type HealthHandler struct {
	// checks maps a dependency name (e.g. "database") to its pinger.
	checks map[string]Pinger
}

// NewHealthHandler returns a HealthHandler checking the given dependencies for readiness.
func NewHealthHandler(checks map[string]Pinger) *HealthHandler {
	return &HealthHandler{checks: checks}
}

// Live handles GET /api/health: the process is up and serving requests.
func (h *HealthHandler) Live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type readyResponse struct {
	OK bool `json:"ok"`
	// Checks maps each dependency to "ok" or "unavailable". Error details are only logged.
	Checks map[string]string `json:"checks"`
}

// Ready handles GET /api/health/ready: every dependency answered within 2 seconds.
// Responds 503 when any check fails, so load balancers can stop routing traffic here.
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	res := readyResponse{OK: true, Checks: make(map[string]string, len(h.checks))}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for name, pinger := range h.checks {
		wg.Go(func() {
			err := pinger.Ping(ctx)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				res.OK = false
				res.Checks[name] = "unavailable"
				observability.Logger(r.Context()).Warn("readiness check failed", slog.String("check", name), slog.Any("error", err))
				return
			}
			res.Checks[name] = "ok"
		})
	}
	wg.Wait()

	status := http.StatusOK
	if !res.OK {
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, res)
}
