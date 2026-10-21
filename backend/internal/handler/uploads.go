package handler

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"lost-and-found/backend/internal/imagetype"
	"lost-and-found/backend/internal/observability"
	"lost-and-found/backend/internal/storage"
)

// MaxUploadBytes is the largest accepted image (5 MB).
const MaxUploadBytes = 5 << 20

// multipartOverhead allows for multipart boundaries and headers around the file.
const multipartOverhead = 64 << 10

// ImageStorage is the object storage the upload handler needs (implemented by storage.Storage).
type ImageStorage interface {
	Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error
	Get(ctx context.Context, key string) (*storage.Object, error)
	PublicURL(key string) string
}

// UploadRecorder counts upload outcomes; may be nil.
type UploadRecorder func(result string)

// UploadHandler serves /api/uploads.
type UploadHandler struct {
	storage ImageStorage
	// recordUpload reports outcomes to metrics (stored, rejected, failed).
	recordUpload UploadRecorder
}

// NewUploadHandler returns an UploadHandler. recordUpload may be nil.
func NewUploadHandler(s ImageStorage, recordUpload UploadRecorder) *UploadHandler {
	if recordUpload == nil {
		recordUpload = func(string) {}
	}
	return &UploadHandler{storage: s, recordUpload: recordUpload}
}

type uploadResponse struct {
	// Key goes into the item's image_key.
	Key string `json:"key"`
	// URL can be used right away to show a preview.
	URL string `json:"url"`
}

// Upload handles POST /api/uploads (multipart/form-data, field "file").
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, MaxUploadBytes+multipartOverhead)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			h.reject(w, http.StatusRequestEntityTooLarge, "Image must be 5 MB or smaller")
			return
		}
		h.reject(w, http.StatusBadRequest, "Expected multipart/form-data with a \"file\" field")
		return
	}
	defer func() { _ = r.MultipartForm.RemoveAll() }()

	file, header, err := r.FormFile("file")
	if err != nil {
		h.reject(w, http.StatusBadRequest, `Missing "file" field`)
		return
	}
	defer func() { _ = file.Close() }()
	if header.Size > MaxUploadBytes {
		h.reject(w, http.StatusRequestEntityTooLarge, "Image must be 5 MB or smaller")
		return
	}

	head := make([]byte, imagetype.SniffLen)
	n, err := io.ReadFull(file, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		h.reject(w, http.StatusBadRequest, "Could not read the file")
		return
	}
	mimeType, ext, ok := imagetype.Detect(head[:n])
	if !ok {
		h.reject(w, http.StatusUnsupportedMediaType, "Only JPEG, PNG, WebP and GIF images are allowed")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		h.fail(w, r, err)
		return
	}

	key := imagetype.NewKey(ext)
	if err := h.storage.Put(r.Context(), key, file, header.Size, mimeType); err != nil {
		h.fail(w, r, err)
		return
	}
	h.recordUpload("stored")
	observability.Logger(r.Context()).Info("image uploaded",
		slog.String("image_key", key), slog.String("content_type", mimeType), slog.Int64("size", header.Size))
	writeJSON(w, http.StatusCreated, uploadResponse{Key: key, URL: h.storage.PublicURL(key)})
}

// Serve handles GET /api/uploads/items/{file}, streaming the image from a private bucket.
func (h *UploadHandler) Serve(w http.ResponseWriter, r *http.Request) {
	key := "items/" + chi.URLParam(r, "file")
	if !imagetype.ValidKey(key) {
		WriteError(w, http.StatusNotFound, "Not found")
		return
	}
	obj, err := h.storage.Get(r.Context(), key)
	if errors.Is(err, storage.ErrNotFound) {
		WriteError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		observability.Logger(r.Context()).Error("serve image", slog.String("image_key", key), slog.Any("error", err))
		WriteError(w, http.StatusBadGateway, "Image storage unavailable")
		return
	}
	defer func() { _ = obj.Body.Close() }()

	w.Header().Set("Content-Type", obj.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(obj.Size, 10))
	// Keys are random and never reused, so the content behind a URL never changes.
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if _, err := io.Copy(w, obj.Body); err != nil {
		observability.Logger(r.Context()).Warn("serve image: copy interrupted", slog.Any("error", err))
	}
}

func (h *UploadHandler) reject(w http.ResponseWriter, status int, message string) {
	h.recordUpload("rejected")
	WriteError(w, status, message)
}

func (h *UploadHandler) fail(w http.ResponseWriter, r *http.Request, err error) {
	h.recordUpload("failed")
	observability.Logger(r.Context()).Error("image upload failed", slog.Any("error", err))
	WriteError(w, http.StatusBadGateway, "Image storage unavailable")
}
