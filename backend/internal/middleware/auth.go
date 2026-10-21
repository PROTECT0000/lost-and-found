// Package middleware contains HTTP middleware specific to this API.
package middleware

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"lost-and-found/backend/internal/observability"
)

// AdminClaims are the JWT claims of an admin session token.
type AdminClaims struct {
	// Role is always "admin"; checked so tokens minted for another purpose are rejected.
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// SignAdminToken creates an HS256 admin token that expires after ttl.
func SignAdminToken(secret string, ttl time.Duration, now time.Time) (token string, expiresAt time.Time, err error) {
	expiresAt = now.Add(ttl)
	claims := AdminClaims{
		Role: "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "admin",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	token, err = jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return token, expiresAt, err
}

// RequireAdmin rejects requests without a valid, unexpired admin bearer token with 401.
func RequireAdmin(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok || raw == "" {
				unauthorized(w, "Missing bearer token")
				return
			}
			var claims AdminClaims
			_, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) { return []byte(secret), nil },
				jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
				jwt.WithExpirationRequired(),
			)
			if err == nil && claims.Role != "admin" {
				err = errors.New("token is not an admin token")
			}
			if err != nil {
				observability.Logger(r.Context()).Info("admin auth rejected", slog.String("reason", err.Error()))
				unauthorized(w, "Invalid or expired token")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func unauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="admin"`)
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":"` + message + `"}`))
}
