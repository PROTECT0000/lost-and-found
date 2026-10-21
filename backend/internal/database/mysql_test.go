package database_test

import (
	"testing"
	"time"

	"lost-and-found/backend/internal/database"
)

func TestConfigFromDSNForcesRequiredOptions(t *testing.T) {
	// A DSN that explicitly sets the opposite of what the app needs.
	cfg, err := database.ConfigFromDSN("u:p@tcp(db:3306)/app?parseTime=false&loc=Local&time_zone=%27SYSTEM%27")
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.ParseTime || cfg.Loc != time.UTC || !cfg.ClientFoundRows || cfg.Params["time_zone"] != "'+00:00'" {
		t.Errorf("parseTime=%v loc=%v clientFoundRows=%v time_zone=%q",
			cfg.ParseTime, cfg.Loc, cfg.ClientFoundRows, cfg.Params["time_zone"])
	}
	if cfg.User != "u" || cfg.Addr != "db:3306" || cfg.DBName != "app" {
		t.Errorf("connection details changed: %+v", cfg)
	}
}

func TestConfigFromDSNRejectsGarbage(t *testing.T) {
	if _, err := database.ConfigFromDSN("not a dsn"); err == nil {
		t.Fatal("expected an error")
	}
}
