// Package config loads application settings from the environment (and an optional .env file).
package config

import (
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Config holds all runtime settings for the API server.
type Config struct {
	// Port is the HTTP port for the public API.
	Port int `env:"PORT" envDefault:"8787"`
	// MetricsAddr is the listen address for the Prometheus /metrics endpoint.
	// Kept separate from the public port so it is not exposed to the internet by default.
	MetricsAddr string `env:"METRICS_ADDR" envDefault:":9091"`
	// LogLevel is one of debug, info, warn, error.
	LogLevel slog.Level `env:"LOG_LEVEL" envDefault:"info"`
	// LogFormat is "text" (human readable, for local development) or "json" (for log collectors).
	LogFormat string `env:"LOG_FORMAT" envDefault:"text"`

	// DatabaseDSN is the MySQL DSN, e.g. user:pass@tcp(host:3306)/lost_and_found.
	// parseTime, loc and time_zone are forced by the database package, so they need not be set here.
	DatabaseDSN string `env:"DATABASE_DSN,required,notEmpty"`

	// CORSOrigins lists allowed browser origins, comma separated. "*" allows any origin.
	CORSOrigins []string `env:"CORS_ORIGINS" envDefault:"*" envSeparator:","`

	// AdminPassword is the shared password for the admin dashboard.
	AdminPassword string `env:"ADMIN_PASSWORD,required,notEmpty"`
	// JWTSecret signs admin session tokens (HS256). Use a long random string.
	JWTSecret string `env:"JWT_SECRET,required,notEmpty"`
	// TokenTTL is how long an admin session token stays valid.
	TokenTTL time.Duration `env:"TOKEN_TTL" envDefault:"8h"`

	S3 S3Config `envPrefix:"S3_"`
}

// S3Config holds settings for S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, SeaweedFS, ...).
type S3Config struct {
	// Endpoint is the storage URL, e.g. http://localhost:8333. The scheme decides whether TLS is used.
	Endpoint string `env:"ENDPOINT,required,notEmpty"`
	// Region is the bucket region ("auto" works for Cloudflare R2).
	Region string `env:"REGION" envDefault:"us-east-1"`
	// Bucket is the bucket name.
	Bucket string `env:"BUCKET,required,notEmpty"`
	// AccessKeyID is the access key.
	AccessKeyID string `env:"ACCESS_KEY_ID,required,notEmpty"`
	// SecretAccessKey is the secret key.
	SecretAccessKey string `env:"SECRET_ACCESS_KEY,required,notEmpty"`
	// PublicURL is an optional public/CDN base URL for the bucket. When empty, images are
	// streamed through the API at /api/uploads/<key>.
	PublicURL string `env:"PUBLIC_URL"`
}

// Load reads .env (if present) and parses the environment into a Config.
// Variables already set in the environment take precedence over .env.
func Load() (Config, error) {
	if err := LoadDotEnv(); err != nil {
		return Config{}, err
	}
	cfg, err := env.ParseAs[Config]()
	if err != nil {
		return Config{}, fmt.Errorf("config: %w", err)
	}
	if cfg.LogFormat != "text" && cfg.LogFormat != "json" {
		return Config{}, fmt.Errorf("config: LOG_FORMAT must be \"text\" or \"json\", got %q", cfg.LogFormat)
	}
	return cfg, nil
}

// LoadDotEnv loads .env into the process environment, ignoring a missing file.
func LoadDotEnv() error {
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("config: load .env: %w", err)
	}
	return nil
}
