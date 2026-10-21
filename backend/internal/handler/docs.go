package handler

import (
	"net/http"

	"lost-and-found/backend/api"
)

// swaggerUIVersion pins the Swagger UI assets loaded from the CDN.
const swaggerUIVersion = "5.17.14"

// docsPage renders Swagger UI for the document served at ./openapi.yaml.
const docsPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lost &amp; Found API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@` + swaggerUIVersion + `/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@` + swaggerUIVersion + `/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: 'openapi.yaml', dom_id: '#swagger-ui', persistAuthorization: true })
  </script>
</body>
</html>
`

// OpenAPI handles GET /api/openapi.yaml.
func OpenAPI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	_, _ = w.Write(api.OpenAPI)
}

// Docs handles GET /api/docs: interactive documentation for OpenAPI.
func Docs(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(docsPage))
}
