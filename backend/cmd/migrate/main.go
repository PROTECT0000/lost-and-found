// Command migrate manages the database schema.
//
// Usage:
//
//	go run ./cmd/migrate up|down|status|seed
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"

	"github.com/caarlos0/env/v11"
	"github.com/pressly/goose/v3"

	"lost-and-found/backend/internal/config"
	"lost-and-found/backend/internal/database"
	"lost-and-found/backend/migrations"
	"lost-and-found/backend/seed"
)

// migrateConfig only needs the DSN, so migrations can run without the API's other settings.
type migrateConfig struct {
	DatabaseDSN string `env:"DATABASE_DSN,required,notEmpty"`
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		slog.Error("migrate failed", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) != 1 {
		return errors.New("usage: migrate up|down|status|seed")
	}
	if err := config.LoadDotEnv(); err != nil {
		return err
	}
	cfg, err := env.ParseAs[migrateConfig]()
	if err != nil {
		return err
	}

	ctx := context.Background()
	db, err := database.Open(ctx, cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	if args[0] == "seed" {
		res, err := db.ExecContext(ctx, seed.SQL)
		if err != nil {
			return fmt.Errorf("seed: %w", err)
		}
		n, _ := res.RowsAffected()
		slog.Info("seed applied", slog.Int64("inserted", n))
		return nil
	}

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("mysql"); err != nil {
		return err
	}
	switch args[0] {
	case "up":
		return goose.UpContext(ctx, db.DB, ".")
	case "down":
		return goose.DownContext(ctx, db.DB, ".")
	case "status":
		return goose.StatusContext(ctx, db.DB, ".")
	default:
		return fmt.Errorf("unknown command %q (want up, down, status or seed)", args[0])
	}
}
