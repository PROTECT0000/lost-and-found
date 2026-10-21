package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"lost-and-found/backend/internal/model"
	"lost-and-found/backend/internal/service"
)

// URLBuilder turns a stored image key into the URL clients use (implemented by storage.Storage).
type URLBuilder interface {
	PublicURL(key string) string
}

// ItemHandler serves /api/items.
type ItemHandler struct {
	items *service.ItemService
	urls  URLBuilder
}

// NewItemHandler returns an ItemHandler.
func NewItemHandler(items *service.ItemService, urls URLBuilder) *ItemHandler {
	return &ItemHandler{items: items, urls: urls}
}

// listResponse is the body of GET /api/items.
type listResponse struct {
	Data []model.Item     `json:"data"`
	Meta model.Pagination `json:"meta"`
}

// withImageURL fills in ImageURL from ImageKey.
func (h *ItemHandler) withImageURL(item *model.Item) *model.Item {
	if item.ImageKey != nil {
		url := h.urls.PublicURL(*item.ImageKey)
		item.ImageURL = &url
	}
	return item
}

// List handles GET /api/items.
func (h *ItemHandler) List(w http.ResponseWriter, r *http.Request) {
	filter, issues := ParseItemFilter(r.URL.Query())
	if len(issues) > 0 {
		writeValidationError(w, issues)
		return
	}
	items, total, err := h.items.List(r.Context(), filter)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	for i := range items {
		h.withImageURL(&items[i])
	}
	writeJSON(w, http.StatusOK, listResponse{
		Data: items,
		Meta: model.Pagination{Page: filter.Page, Limit: filter.Limit, Total: total},
	})
}

// Get handles GET /api/items/{id}.
func (h *ItemHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.items.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, h.withImageURL(item))
}

// Create handles POST /api/items (public: anyone can report an item).
func (h *ItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateItemRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	in, issues := req.Validate()
	if len(issues) > 0 {
		writeValidationError(w, issues)
		return
	}
	item, err := h.items.Create(r.Context(), in)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, h.withImageURL(item))
}

// Update handles PATCH /api/items/{id} (admin only).
func (h *ItemHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req UpdateItemRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	changes, issues := req.Validate()
	if len(issues) > 0 {
		writeValidationError(w, issues)
		return
	}
	item, err := h.items.Update(r.Context(), chi.URLParam(r, "id"), changes)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, h.withImageURL(item))
}

// Delete handles DELETE /api/items/{id} (admin only).
func (h *ItemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.items.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Stats handles GET /api/admin/stats (admin only).
func (h *ItemHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.items.Stats(r.Context())
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
