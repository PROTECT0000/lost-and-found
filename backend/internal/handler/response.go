// Package handler contains the HTTP handlers.
package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"lost-and-found/backend/internal/observability"
	"lost-and-found/backend/internal/service"
)

// errorResponse is the JSON body for every error. The frontend reads Error.
type errorResponse struct {
	Error string `json:"error"`
	// Issues lists per-field validation problems (only for validation errors).
	Issues []Issue `json:"issues,omitempty"`
}

// Issue is one validation problem.
type Issue struct {
	// Field is the JSON field or query parameter name; empty for request-level problems.
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

// writeJSON writes v as JSON with the given status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError writes {"error": message} with the given status.
func WriteError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}

// writeValidationError writes a 400 with the list of issues.
func writeValidationError(w http.ResponseWriter, issues []Issue) {
	writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Validation failed", Issues: issues})
}

// writeServiceError maps service errors to responses; unexpected errors are logged and hidden
// behind a generic 500 so internal details never reach the client.
func writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, service.ErrNotFound) {
		WriteError(w, http.StatusNotFound, "Item not found")
		return
	}
	observability.Logger(r.Context()).Error("request failed", slog.Any("error", err))
	WriteError(w, http.StatusInternalServerError, "Internal server error")
}

// decodeJSON reads a JSON body of at most 1 MB into dst. Unknown fields are ignored.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			WriteError(w, http.StatusRequestEntityTooLarge, "Request body too large")
			return false
		}
		writeValidationError(w, []Issue{{Message: "Invalid JSON body"}})
		return false
	}
	return true
}
