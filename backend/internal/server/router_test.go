package server_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"lost-and-found/backend/internal/handler"
	"lost-and-found/backend/internal/middleware"
	"lost-and-found/backend/internal/server"
	"lost-and-found/backend/internal/service"
	"lost-and-found/backend/internal/testfake"
)

const (
	adminPassword = "correct horse"
	jwtSecret     = "test-secret"
)

type app struct {
	handler http.Handler
	store   *testfake.Storage
	logs    *bytes.Buffer
}

func newApp(t *testing.T, publicBase string) *app {
	t.Helper()
	items, store := testfake.NewItems(), testfake.NewStorage()
	store.PublicBase = publicBase
	logs := &bytes.Buffer{}
	svc := service.NewItemService(items, store, nil)
	h := server.NewRouter(server.Deps{
		Logger:      slog.New(slog.NewJSONHandler(logs, nil)),
		CORSOrigins: []string{"*"},
		JWTSecret:   jwtSecret,
		Items:       handler.NewItemHandler(svc, store),
		Auth:        handler.NewAuthHandler(adminPassword, jwtSecret, time.Hour),
		Uploads:     handler.NewUploadHandler(store, nil),
		Health:      handler.NewHealthHandler(map[string]handler.Pinger{"database": okPinger{}}),
	})
	return &app{handler: h, store: store, logs: logs}
}

type okPinger struct{}

func (okPinger) Ping(context.Context) error { return nil }

func (a *app) do(method, path string, body io.Reader, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, body)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	a.handler.ServeHTTP(rec, req)
	return rec
}

func jsonBody(v any) io.Reader {
	b, _ := json.Marshal(v)
	return bytes.NewReader(b)
}

var validItem = map[string]any{
	"type": "lost", "title": "Black wallet", "category": "wallet", "location": "Library",
	"occurred_at": "2026-10-20T08:00:00Z", "contact_name": "Rina", "contact_info": "rina@example.com",
}

func bearer(token string) map[string]string {
	return map[string]string{"Authorization": "Bearer " + token}
}

func signToken(t *testing.T, secret string, exp time.Time, role string) string {
	t.Helper()
	claims := middleware.AdminClaims{Role: role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(exp)}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func adminToken(t *testing.T) string {
	return signToken(t, jwtSecret, time.Now().Add(time.Hour), "admin")
}

// --- auth ---

func TestLoginFlow(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("POST", "/api/auth/login", jsonBody(map[string]string{"password": adminPassword}), nil)
	if rec.Code != 200 {
		t.Fatalf("login status %d: %s", rec.Code, rec.Body)
	}
	var res struct {
		Token     string `json:"token"`
		ExpiresAt int64  `json:"expiresAt"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	// expiresAt is in milliseconds for the JavaScript frontend.
	if res.ExpiresAt < time.Now().Add(59*time.Minute).UnixMilli() {
		t.Errorf("expiresAt %d looks wrong (want ms, ~1h ahead)", res.ExpiresAt)
	}
	if rec := a.do("GET", "/api/auth/me", nil, bearer(res.Token)); rec.Code != 200 {
		t.Errorf("/me with fresh token: %d", rec.Code)
	}
}

func TestLoginRejectsWrongPasswords(t *testing.T) {
	a := newApp(t, "")
	for _, pw := range []string{"wrong", adminPassword + " ", strings.ToUpper(adminPassword)} {
		if rec := a.do("POST", "/api/auth/login", jsonBody(map[string]string{"password": pw}), nil); rec.Code != 401 {
			t.Errorf("password %q: status %d, want 401", pw, rec.Code)
		}
	}
	if rec := a.do("POST", "/api/auth/login", jsonBody(map[string]string{}), nil); rec.Code != 400 {
		t.Errorf("missing password: status %d, want 400", rec.Code)
	}
}

func TestAdminRoutesRejectBadTokens(t *testing.T) {
	routes := []struct{ method, path string }{
		{"PATCH", "/api/items/some-id"},
		{"DELETE", "/api/items/some-id"},
		{"GET", "/api/admin/stats"},
		{"GET", "/api/auth/me"},
	}
	tokens := map[string]map[string]string{
		"no token":     nil,
		"not bearer":   {"Authorization": "Basic abc"},
		"garbage":      bearer("abc.def.ghi"),
		"expired":      bearer(signToken(t, jwtSecret, time.Now().Add(-time.Minute), "admin")),
		"other secret": bearer(signToken(t, "other-secret", time.Now().Add(time.Hour), "admin")),
		"wrong role":   bearer(signToken(t, jwtSecret, time.Now().Add(time.Hour), "user")),
		"alg none":     bearer(noneToken(t)),
	}
	a := newApp(t, "")
	for _, r := range routes {
		for name, headers := range tokens {
			rec := a.do(r.method, r.path, jsonBody(map[string]string{"status": "resolved"}), headers)
			if rec.Code != 401 {
				t.Errorf("%s %s with %s: status %d, want 401", r.method, r.path, name, rec.Code)
			}
		}
	}
}

// noneToken is an unsigned token ("alg": "none") that must never be accepted.
func noneToken(t *testing.T) string {
	t.Helper()
	claims := middleware.AdminClaims{Role: "admin", RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestCreatingItemsIsPublic(t *testing.T) {
	a := newApp(t, "")
	if rec := a.do("POST", "/api/items", jsonBody(validItem), nil); rec.Code != 201 {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
}

// --- items ---

func TestPatchAndDeleteWithToken(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("POST", "/api/items", jsonBody(validItem), nil)
	var item map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &item)
	id := item["id"].(string)

	rec = a.do("PATCH", "/api/items/"+id, jsonBody(map[string]string{"status": "resolved"}), bearer(adminToken(t)))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"status":"resolved"`) {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body)
	}
	if rec := a.do("DELETE", "/api/items/"+id, nil, bearer(adminToken(t))); rec.Code != 204 {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := a.do("GET", "/api/items/"+id, nil, nil); rec.Code != 404 {
		t.Errorf("get deleted: %d, want 404", rec.Code)
	}
}

func TestValidationErrorShape(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("POST", "/api/items", jsonBody(map[string]string{"type": "x"}), nil)
	if rec.Code != 400 {
		t.Fatalf("status %d", rec.Code)
	}
	var res struct {
		Error  string          `json:"error"`
		Issues []handler.Issue `json:"issues"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if res.Error == "" || len(res.Issues) == 0 {
		t.Errorf("body = %s, want error + issues", rec.Body)
	}
	if rec := a.do("POST", "/api/items", strings.NewReader("{not json"), nil); rec.Code != 400 {
		t.Errorf("malformed JSON: %d, want 400", rec.Code)
	}
}

func TestUnknownRoutesReturnJSON(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("GET", "/api/nope", nil, nil)
	if rec.Code != 404 || !strings.Contains(rec.Body.String(), `"error"`) {
		t.Errorf("got %d %s", rec.Code, rec.Body)
	}
	if rec := a.do("PUT", "/api/items", nil, nil); rec.Code != 405 {
		t.Errorf("PUT /api/items: %d, want 405", rec.Code)
	}
}

// --- uploads ---

var images = map[string][]byte{
	"png":  []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR"),
	"jpeg": {0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 'J', 'F', 'I', 'F'},
	"gif":  []byte("GIF89a\x01\x00\x01\x00"),
	"webp": []byte("RIFF\x24\x00\x00\x00WEBPVP8 "),
}

func uploadBody(t *testing.T, data []byte, field string) (io.Reader, map[string]string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile(field, "photo.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write(data)
	_ = w.Close()
	return &buf, map[string]string{"Content-Type": w.FormDataContentType()}
}

func upload(t *testing.T, a *app, data []byte) (*httptest.ResponseRecorder, string) {
	t.Helper()
	body, headers := uploadBody(t, data, "file")
	rec := a.do("POST", "/api/uploads", body, headers)
	var res struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	return rec, res.Key
}

func TestUploadStoresDetectedType(t *testing.T) {
	want := map[string]string{"png": "image/png", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}
	a := newApp(t, "")
	for name, data := range images {
		rec, key := upload(t, a, data)
		if rec.Code != 201 {
			t.Fatalf("%s: status %d %s", name, rec.Code, rec.Body)
		}
		obj := a.store.Objects[key]
		if obj.ContentType != want[name] || !bytes.Equal(obj.Body, data) {
			t.Errorf("%s: stored %q (%d bytes)", name, obj.ContentType, len(obj.Body))
		}
	}
}

func TestUploadRejectsNonImages(t *testing.T) {
	a := newApp(t, "")
	rec, _ := upload(t, a, []byte("<html><script>alert(1)</script></html>"))
	if rec.Code != 415 || len(a.store.Objects) != 0 {
		t.Errorf("status %d, stored %d objects", rec.Code, len(a.store.Objects))
	}
}

func TestUploadSizeLimit(t *testing.T) {
	a := newApp(t, "")
	exact := make([]byte, handler.MaxUploadBytes)
	copy(exact, images["png"])
	if rec, _ := upload(t, a, exact); rec.Code != 201 {
		t.Errorf("exactly 5 MB: status %d, want 201", rec.Code)
	}
	tooBig := make([]byte, handler.MaxUploadBytes+1)
	copy(tooBig, images["png"])
	if rec, _ := upload(t, a, tooBig); rec.Code != 413 {
		t.Errorf("5 MB + 1 byte: status %d, want 413", rec.Code)
	}
	huge := make([]byte, handler.MaxUploadBytes+200<<10) // beyond the multipart allowance
	copy(huge, images["png"])
	if rec, _ := upload(t, a, huge); rec.Code != 413 {
		t.Errorf("5.2 MB: status %d, want 413", rec.Code)
	}
}

func TestUploadRequiresFileField(t *testing.T) {
	a := newApp(t, "")
	body, headers := uploadBody(t, images["png"], "other")
	if rec := a.do("POST", "/api/uploads", body, headers); rec.Code != 400 {
		t.Errorf("status %d, want 400", rec.Code)
	}
	if rec := a.do("POST", "/api/uploads", strings.NewReader("x"), nil); rec.Code != 400 {
		t.Errorf("non-multipart: status %d, want 400", rec.Code)
	}
}

func TestServeUploadedImage(t *testing.T) {
	a := newApp(t, "")
	_, key := upload(t, a, images["png"])
	rec := a.do("GET", "/api/uploads/"+key, nil, nil)
	if rec.Code != 200 || rec.Header().Get("Content-Type") != "image/png" ||
		rec.Header().Get("X-Content-Type-Options") != "nosniff" || !bytes.Equal(rec.Body.Bytes(), images["png"]) {
		t.Errorf("got %d %v", rec.Code, rec.Header())
	}
	for _, path := range []string{
		"/api/uploads/items/00000000-0000-4000-8000-000000000000.png", // valid but missing
		"/api/uploads/items/..%2F..%2Fsecret",
		"/api/uploads/items/notes.txt",
	} {
		if rec := a.do("GET", path, nil, nil); rec.Code != 404 {
			t.Errorf("%s: %d, want 404", path, rec.Code)
		}
	}
}

func TestImageURL(t *testing.T) {
	for _, tc := range []struct{ publicBase, wantPrefix string }{
		{"", "/api/uploads/items/"},
		{"https://cdn.example.com", "https://cdn.example.com/items/"},
	} {
		a := newApp(t, tc.publicBase)
		_, key := upload(t, a, images["png"])
		item := map[string]any{}
		for k, v := range validItem {
			item[k] = v
		}
		item["image_key"] = key
		rec := a.do("POST", "/api/items", jsonBody(item), nil)
		var res struct {
			ImageURL *string `json:"image_url"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		if res.ImageURL == nil || !strings.HasPrefix(*res.ImageURL, tc.wantPrefix) {
			t.Errorf("public base %q: image_url = %v", tc.publicBase, res.ImageURL)
		}
	}

	a := newApp(t, "")
	rec := a.do("POST", "/api/items", jsonBody(validItem), nil)
	if !strings.Contains(rec.Body.String(), `"image_url":null`) {
		t.Errorf("no image: %s", rec.Body)
	}
}

// --- observability ---

func TestRequestIDIsReturnedAndLogged(t *testing.T) {
	a := newApp(t, "")
	rec := a.do("GET", "/api/health", nil, nil)
	id := rec.Header().Get("X-Request-ID")
	if id == "" || !strings.Contains(a.logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("request id %q not in logs: %s", id, a.logs)
	}
	if !strings.Contains(a.logs.String(), `"route":"/api/health"`) {
		t.Errorf("route pattern missing from logs: %s", a.logs)
	}

	rec = a.do("GET", "/api/health", nil, map[string]string{"X-Request-ID": "from-proxy-123"})
	if got := rec.Header().Get("X-Request-ID"); got != "from-proxy-123" {
		t.Errorf("incoming id not reused: %q", got)
	}
	rec = a.do("GET", "/api/health", nil, map[string]string{"X-Request-ID": "bad id\nwith newline"})
	if got := rec.Header().Get("X-Request-ID"); got == "" || strings.ContainsAny(got, " \n") {
		t.Errorf("unsafe incoming id should be replaced, got %q", got)
	}
}

func TestReadiness(t *testing.T) {
	a := newApp(t, "")
	if rec := a.do("GET", "/api/health/ready", nil, nil); rec.Code != 200 {
		t.Errorf("ready: %d %s", rec.Code, rec.Body)
	}

	h := handler.NewHealthHandler(map[string]handler.Pinger{"database": okPinger{}, "storage": failPinger{}})
	rec := httptest.NewRecorder()
	h.Ready(rec, httptest.NewRequest("GET", "/api/health/ready", nil))
	if rec.Code != 503 || !strings.Contains(rec.Body.String(), `"storage":"unavailable"`) || strings.Contains(rec.Body.String(), "secret") {
		t.Errorf("failing dependency: %d %s", rec.Code, rec.Body)
	}
}

type failPinger struct{}

func (failPinger) Ping(context.Context) error { return errors.New("dial tcp: secret internal address") }
