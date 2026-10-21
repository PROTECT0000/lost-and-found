// Package database opens the MySQL connection pool.
package database

import (
	"context"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// Open connects to MySQL and verifies the connection.
//
// Some DSN options are forced because the code relies on them:
//   - parseTime + loc=UTC: DATETIME columns scan into time.Time in UTC.
//   - time_zone='+00:00': CURRENT_TIMESTAMP defaults (created_at/updated_at) are UTC too.
//   - clientFoundRows: UPDATE reports matched rows instead of changed rows, so updating a row
//     with identical values is not mistaken for "not found".
func Open(ctx context.Context, dsn string) (*sqlx.DB, error) {
	cfg, err := ConfigFromDSN(dsn)
	if err != nil {
		return nil, err
	}
	db, err := sqlx.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("database: open: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("database: ping %s@%s/%s: %w", cfg.User, cfg.Addr, cfg.DBName, err)
	}
	return db, nil
}

// ConfigFromDSN parses dsn and applies the options the application depends on.
func ConfigFromDSN(dsn string) (*mysql.Config, error) {
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("database: invalid DATABASE_DSN: %w", err)
	}
	cfg.ParseTime = true
	cfg.Loc = time.UTC
	cfg.ClientFoundRows = true
	if cfg.Params == nil {
		cfg.Params = map[string]string{}
	}
	cfg.Params["time_zone"] = "'+00:00'"
	return cfg, nil
}
