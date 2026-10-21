// Package server wires handlers and middleware into the HTTP router.
package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"lost-and-found/backend/internal/handler"
	"lost-and-found/backend/internal/middleware"
	"lost-and-found/backend/internal/observability"
)

// Deps are the dependencies needed to build the router.
type Deps struct {
	Logger  *slog.Logger
	Metrics *observability.Metrics
	// CORSOrigins are the allowed browser origins ("*" for any).
	CORSOrigins []string
	// JWTSecret verifies admin tokens.
	JWTSecret string

	Items   *handler.ItemHandler
	Auth    *handler.AuthHandler
	Uploads *handler.UploadHandler
	Health  *handler.HealthHandler
}

// NewRouter builds the API router.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RealIP)
	r.Use(observability.RequestLogger(d.Logger))
	r.Use(observability.Recoverer)
	if d.Metrics != nil {
		r.Use(d.Metrics.Middleware)
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: d.CORSOrigins,
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowedHeaders: []string{"Authorization", "Content-Type", observability.RequestIDHeader},
		ExposedHeaders: []string{observability.RequestIDHeader},
		MaxAge:         600,
	}))

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		handler.WriteError(w, http.StatusNotFound, "Not found")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		handler.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	})

	requireAdmin := middleware.RequireAdmin(d.JWTSecret)

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", d.Health.Live)
		r.Get("/health/ready", d.Health.Ready)

		r.Route("/items", func(r chi.Router) {
			r.Get("/", d.Items.List)
			r.Post("/", d.Items.Create)
			r.Get("/{id}", d.Items.Get)
			r.With(requireAdmin).Patch("/{id}", d.Items.Update)
			r.With(requireAdmin).Delete("/{id}", d.Items.Delete)
		})

		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", d.Auth.Login)
			r.With(requireAdmin).Get("/me", d.Auth.Me)
		})

		r.With(requireAdmin).Get("/admin/stats", d.Items.Stats)

		r.Post("/uploads", d.Uploads.Upload)
		r.Get("/uploads/items/{file}", d.Uploads.Serve)
	})
	return r
}
