package observability

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds the application's Prometheus collectors.
type Metrics struct {
	registry *prometheus.Registry

	requests        *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
	inFlight        prometheus.Gauge

	// Uploads counts image uploads by result: stored, rejected (bad type/size) or failed (storage error).
	Uploads *prometheus.CounterVec
	// ImageCleanups counts deletions of unused images by result: deleted, kept (still referenced) or failed.
	ImageCleanups *prometheus.CounterVec
}

// NewMetrics creates the collectors, including Go runtime, process and (when db is not nil)
// connection-pool metrics.
func NewMetrics(db *sql.DB) *Metrics {
	m := &Metrics{
		registry: prometheus.NewRegistry(),
		requests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "HTTP requests by method, route pattern and status code.",
		}, []string{"method", "route", "status"}),
		requestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency by method and route pattern.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		inFlight: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "HTTP requests currently being served.",
		}),
		Uploads: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "lostfound_image_uploads_total",
			Help: "Image uploads by result (stored, rejected, failed).",
		}, []string{"result"}),
		ImageCleanups: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "lostfound_image_cleanups_total",
			Help: "Cleanup of images no longer used by an item, by result (deleted, kept, failed).",
		}, []string{"result"}),
	}
	m.registry.MustRegister(
		m.requests, m.requestDuration, m.inFlight, m.Uploads, m.ImageCleanups,
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	if db != nil {
		m.registry.MustRegister(collectors.NewDBStatsCollector(db, "mysql"))
	}
	return m
}

// Middleware records request count, latency and in-flight requests. It must run inside the chi
// router so the matched route pattern is known when the request finishes.
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		m.inFlight.Inc()
		defer m.inFlight.Dec()

		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}
		route := routePattern(r)
		m.requests.WithLabelValues(r.Method, route, strconv.Itoa(status)).Inc()
		m.requestDuration.WithLabelValues(r.Method, route).Observe(time.Since(start).Seconds())
	})
}

// Handler serves the metrics in the Prometheus exposition format.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{Registry: m.registry})
}
