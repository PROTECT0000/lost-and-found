package handler

import (
	"crypto/sha256"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"time"

	"lost-and-found/backend/internal/middleware"
	"lost-and-found/backend/internal/observability"
)

// AuthHandler serves /api/auth.
type AuthHandler struct {
	adminPassword string
	jwtSecret     string
	tokenTTL      time.Duration
	// now is replaceable in tests.
	now func() time.Time
}

// NewAuthHandler returns an AuthHandler.
func NewAuthHandler(adminPassword, jwtSecret string, tokenTTL time.Duration) *AuthHandler {
	return &AuthHandler{adminPassword: adminPassword, jwtSecret: jwtSecret, tokenTTL: tokenTTL, now: time.Now}
}

type loginRequest struct {
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
	// ExpiresAt is a Unix timestamp in milliseconds (what JavaScript's Date uses).
	ExpiresAt int64 `json:"expiresAt"`
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Password == "" {
		writeValidationError(w, []Issue{{Field: "password", Message: "Required"}})
		return
	}
	if !passwordMatches(req.Password, h.adminPassword) {
		observability.Logger(r.Context()).Warn("admin login failed")
		WriteError(w, http.StatusUnauthorized, "Invalid password")
		return
	}
	token, expiresAt, err := middleware.SignAdminToken(h.jwtSecret, h.tokenTTL, h.now())
	if err != nil {
		observability.Logger(r.Context()).Error("sign admin token", slog.Any("error", err))
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	observability.Logger(r.Context()).Info("admin login succeeded")
	writeJSON(w, http.StatusOK, loginResponse{Token: token, ExpiresAt: expiresAt.UnixMilli()})
}

// Me handles GET /api/auth/me; RequireAdmin has already validated the token.
func (h *AuthHandler) Me(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"role": "admin"})
}

// passwordMatches compares in constant time. Hashing first makes both inputs the same length,
// so the comparison time does not reveal the password length either.
func passwordMatches(input, expected string) bool {
	a := sha256.Sum256([]byte(input))
	b := sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(a[:], b[:]) == 1
}
