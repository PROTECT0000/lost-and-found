package server_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"go.yaml.in/yaml/v3"

	"lost-and-found/backend/api"
)

// Every route the router serves must be documented in api/openapi.yaml, and vice versa.
func TestOpenAPICoversEveryRoute(t *testing.T) {
	var doc struct {
		OpenAPI string                    `yaml:"openapi"`
		Paths   map[string]map[string]any `yaml:"paths"`
	}
	if err := yaml.Unmarshal(api.OpenAPI, &doc); err != nil {
		t.Fatalf("api/openapi.yaml: %v", err)
	}
	if !strings.HasPrefix(doc.OpenAPI, "3.") {
		t.Fatalf("openapi version %q", doc.OpenAPI)
	}

	routes, ok := newApp(t, "").handler.(chi.Routes)
	if !ok {
		t.Fatal("router is not a chi.Routes")
	}
	served := map[string]bool{}
	err := chi.Walk(routes, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		path := strings.TrimSuffix(route, "/")
		key := strings.ToLower(method) + " " + path
		served[key] = true
		if _, ok := doc.Paths[path][strings.ToLower(method)]; !ok {
			t.Errorf("%s %s is not documented in api/openapi.yaml", method, path)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	for path, ops := range doc.Paths {
		for method := range ops {
			if method == "parameters" {
				continue
			}
			if !served[method+" "+path] {
				t.Errorf("api/openapi.yaml documents %s %s, which the router does not serve", strings.ToUpper(method), path)
			}
		}
	}
}

func TestDocsEndpoints(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("GET", "/api/openapi.yaml", nil, nil)
	if rec.Code != 200 || !strings.HasPrefix(rec.Body.String(), "openapi: 3.1") {
		t.Errorf("openapi.yaml: status %d, body starts %.20q", rec.Code, rec.Body.String())
	}
	rec = a.do("GET", "/api/docs", nil, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "SwaggerUIBundle") {
		t.Errorf("docs: status %d", rec.Code)
	}
}
