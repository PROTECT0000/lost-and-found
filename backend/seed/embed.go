// Package seed embeds sample data for local development.
package seed

import _ "embed"

// SQL inserts sample items. It uses INSERT IGNORE, so running it twice is harmless.
//
//go:embed seed.sql
var SQL string
