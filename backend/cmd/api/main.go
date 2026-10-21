// Command api runs the Lost & Found HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lost-and-found/backend/internal/config"
	"lost-and-found/backend/internal/database"
	"lost-and-found/backend/internal/handler"
	"lost-and-found/backend/internal/observability"
	"lost-and-found/backend/internal/repository"
	"lost-and-found/backend/internal/server"
	"lost-and-found/backend/internal/service"
	"lost-and-found/backend/internal/storage"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", slog.Any("error", err))
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	logger := observability.NewLogger(os.Stdout, cfg.LogFormat, cfg.LogLevel)
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(ctx, cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	store, err := storage.New(cfg.S3)
	if err != nil {
		return err
	}
	if err := store.Ping(ctx); err != nil {
		// Not fatal: the API can serve items without storage; readiness reports the problem.
		logger.Warn("object storage not reachable at startup", slog.Any("error", err))
	}

	metrics := observability.NewMetrics(db.DB)
	repo := repository.NewItemRepository(db)
	items := service.NewItemService(repo, store, func(result string) {
		metrics.ImageCleanups.WithLabelValues(result).Inc()
	})

	router := server.NewRouter(server.Deps{
		Logger:      logger,
		Metrics:     metrics,
		CORSOrigins: cfg.CORSOrigins,
		JWTSecret:   cfg.JWTSecret,
		Items:       handler.NewItemHandler(items, store),
		Auth:        handler.NewAuthHandler(cfg.AdminPassword, cfg.JWTSecret, cfg.TokenTTL),
		Uploads: handler.NewUploadHandler(store, func(result string) {
			metrics.Uploads.WithLabelValues(result).Inc()
		}),
		Health: handler.NewHealthHandler(map[string]handler.Pinger{"database": repo, "storage": store}),
	})

	api := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second, // uploads from slow mobile connections
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}
	metricsMux := http.NewServeMux()
	metricsMux.Handle("GET /metrics", metrics.Handler())
	metricsServer := &http.Server{Addr: cfg.MetricsAddr, Handler: metricsMux, ReadHeaderTimeout: 5 * time.Second}

	errs := make(chan error, 2)
	go func() {
		logger.Info("api listening", slog.String("addr", api.Addr))
		errs <- api.ListenAndServe()
	}()
	go func() {
		logger.Info("metrics listening", slog.String("addr", metricsServer.Addr))
		errs <- metricsServer.ListenAndServe()
	}()

	select {
	case err := <-errs:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		logger.Info("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return errors.Join(api.Shutdown(shutdownCtx), metricsServer.Shutdown(shutdownCtx))
}
