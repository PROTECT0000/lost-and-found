// Package api embeds the OpenAPI document describing the HTTP API.
package api

import _ "embed"

// OpenAPI is the OpenAPI 3.1 document (YAML). Keep it in step with internal/server/router.go;
// the router tests fail when a route is missing from it.
//
//go:embed openapi.yaml
var OpenAPI []byte
