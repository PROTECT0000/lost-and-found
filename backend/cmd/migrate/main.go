// Command migrate manages the database schema.
//
// Usage:
//
//	go run ./cmd/migrate up|down|status|seed
package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path"

	"github.com/caarlos0/env/v11"
	"github.com/pressly/goose/v3"

	"lost-and-found/backend/internal/config"
	"lost-and-found/backend/internal/database"
	"lost-and-found/backend/internal/storage"
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
		if err := uploadSeedPhotos(ctx); err != nil {
			return err
		}
		res, err := db.ExecContext(ctx, seed.SQL)
		if err != nil {
			return fmt.Errorf("seed: %w", err)
		}
		n, _ := res.RowsAffected()
		slog.Info("seed applied", slog.Int64("rows_affected", n))
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

// uploadSeedPhotos puts the sample photos in the bucket under the keys the seed items use.
// Only seed needs storage, so the S3_* variables are read here rather than in migrateConfig.
func uploadSeedPhotos(ctx context.Context) error {
	cfg, err := env.ParseAsWithOptions[config.S3Config](env.Options{Prefix: "S3_"})
	if err != nil {
		return fmt.Errorf("seed needs storage settings: %w", err)
	}
	store, err := storage.New(cfg)
	if err != nil {
		return err
	}
	for _, p := range seed.Photos {
		data, err := seed.Images.ReadFile(path.Join("images", p.File))
		if err != nil {
			return fmt.Errorf("seed: %w", err)
		}
		if err := store.Put(ctx, p.Key, bytes.NewReader(data), int64(len(data)), "image/jpeg"); err != nil {
			return fmt.Errorf("seed: %w", err)
		}
	}
	slog.Info("seed photos uploaded", slog.Int("count", len(seed.Photos)))
	return nil
}
