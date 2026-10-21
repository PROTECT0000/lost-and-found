// Package service holds business logic on top of the repository and storage.
package service

import (
	"context"
	"errors"
	"log/slog"

	"lost-and-found/backend/internal/model"
	"lost-and-found/backend/internal/observability"
	"lost-and-found/backend/internal/repository"
)

// ErrNotFound is returned when an item does not exist.
var ErrNotFound = repository.ErrNotFound

// ItemStore is the item persistence the service needs (implemented by repository.ItemRepository).
type ItemStore interface {
	List(ctx context.Context, f model.ItemFilter) ([]model.Item, int, error)
	Get(ctx context.Context, id string) (*model.Item, error)
	Create(ctx context.Context, in model.NewItem) (*model.Item, error)
	Update(ctx context.Context, id string, c model.ItemChanges) (*model.Item, error)
	Delete(ctx context.Context, id string) (bool, error)
	CountImageReferences(ctx context.Context, key string) (int, error)
	Stats(ctx context.Context) (model.Stats, error)
}

// ImageDeleter removes stored images (implemented by storage.Storage).
type ImageDeleter interface {
	Delete(ctx context.Context, key string) error
}

// CleanupRecorder counts image cleanup outcomes; may be nil.
type CleanupRecorder func(result string)

// ItemService implements item use cases, including removing images that are no longer used.
type ItemService struct {
	items  ItemStore
	images ImageDeleter
	// recordCleanup reports cleanup outcomes to metrics (deleted, kept, failed).
	recordCleanup CleanupRecorder
}

// NewItemService returns an ItemService. recordCleanup may be nil.
func NewItemService(items ItemStore, images ImageDeleter, recordCleanup CleanupRecorder) *ItemService {
	if recordCleanup == nil {
		recordCleanup = func(string) {}
	}
	return &ItemService{items: items, images: images, recordCleanup: recordCleanup}
}

// List returns one page of items and the total number of matches.
func (s *ItemService) List(ctx context.Context, f model.ItemFilter) ([]model.Item, int, error) {
	return s.items.List(ctx, f)
}

// Get returns one item or ErrNotFound.
func (s *ItemService) Get(ctx context.Context, id string) (*model.Item, error) {
	return s.items.Get(ctx, id)
}

// Create stores a new item.
func (s *ItemService) Create(ctx context.Context, in model.NewItem) (*model.Item, error) {
	return s.items.Create(ctx, in)
}

// Stats returns dashboard totals.
func (s *ItemService) Stats(ctx context.Context) (model.Stats, error) {
	return s.items.Stats(ctx)
}

// Update applies changes and, when the photo was replaced or removed, deletes the old image
// once no other item references it.
func (s *ItemService) Update(ctx context.Context, id string, changes model.ItemChanges) (*model.Item, error) {
	previous, err := s.items.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	updated, err := s.items.Update(ctx, id, changes)
	if err != nil {
		return nil, err
	}
	if changes.ImageKey.Set && !sameKey(previous.ImageKey, updated.ImageKey) {
		s.cleanupImage(ctx, previous.ImageKey)
	}
	return updated, nil
}

// Delete removes the item and its image (unless another item still uses the image).
func (s *ItemService) Delete(ctx context.Context, id string) error {
	previous, err := s.items.Get(ctx, id)
	if err != nil {
		return err
	}
	deleted, err := s.items.Delete(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrNotFound
	}
	s.cleanupImage(ctx, previous.ImageKey)
	return nil
}

// cleanupImage deletes key from storage when no item references it anymore. Failures are logged
// and counted but not returned: the item change already succeeded and an orphaned image is harmless.
func (s *ItemService) cleanupImage(ctx context.Context, key *string) {
	if key == nil {
		return
	}
	log := observability.Logger(ctx).With(slog.String("image_key", *key))

	refs, err := s.items.CountImageReferences(ctx, *key)
	if err != nil {
		s.recordCleanup("failed")
		log.Error("image cleanup: count references", slog.Any("error", err))
		return
	}
	if refs > 0 {
		s.recordCleanup("kept")
		log.Debug("image cleanup: still referenced", slog.Int("references", refs))
		return
	}
	if err := s.images.Delete(ctx, *key); err != nil {
		s.recordCleanup("failed")
		log.Error("image cleanup: delete", slog.Any("error", err))
		return
	}
	s.recordCleanup("deleted")
	log.Info("image cleanup: deleted unused image")
}

func sameKey(a, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

// IsNotFound reports whether err means the item does not exist.
func IsNotFound(err error) bool { return errors.Is(err, ErrNotFound) }
