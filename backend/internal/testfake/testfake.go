// Package testfake provides in-memory fakes of the item store and object storage for tests.
package testfake

import (
	"bytes"
	"context"
	"io"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"lost-and-found/backend/internal/model"
	"lost-and-found/backend/internal/repository"
	"lost-and-found/backend/internal/storage"
)

// Items is an in-memory service.ItemStore. Filtering is not implemented (covered by repository tests).
type Items struct {
	mu    sync.Mutex
	items map[string]model.Item
}

// NewItems returns an empty Items store.
func NewItems() *Items { return &Items{items: map[string]model.Item{}} }

// List returns all items, newest first.
func (f *Items) List(_ context.Context, filter model.ItemFilter) ([]model.Item, int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]model.Item, 0, len(f.items))
	for _, it := range f.items {
		out = append(out, it)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, len(out), nil
}

// Get returns a copy of the item or repository.ErrNotFound.
func (f *Items) Get(_ context.Context, id string) (*model.Item, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	it, ok := f.items[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return &it, nil
}

// Create stores a new item.
func (f *Items) Create(_ context.Context, in model.NewItem) (*model.Item, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	now := time.Now().UTC()
	it := model.Item{
		ID: uuid.NewString(), Type: in.Type, Title: in.Title, Description: in.Description, Category: in.Category,
		Location: in.Location, OccurredAt: in.OccurredAt, ContactName: in.ContactName, ContactInfo: in.ContactInfo,
		ImageKey: in.ImageKey, Status: in.Status, CreatedAt: now, UpdatedAt: now,
	}
	f.items[it.ID] = it
	return &it, nil
}

// Update applies the set fields.
func (f *Items) Update(_ context.Context, id string, c model.ItemChanges) (*model.Item, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	it, ok := f.items[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	if c.Type.Set {
		it.Type = c.Type.Value
	}
	if c.Title.Set {
		it.Title = c.Title.Value
	}
	if c.Description.Set {
		it.Description = c.Description.Value
	}
	if c.Category.Set {
		it.Category = c.Category.Value
	}
	if c.Location.Set {
		it.Location = c.Location.Value
	}
	if c.OccurredAt.Set {
		it.OccurredAt = c.OccurredAt.Value
	}
	if c.ContactName.Set {
		it.ContactName = c.ContactName.Value
	}
	if c.ContactInfo.Set {
		it.ContactInfo = c.ContactInfo.Value
	}
	if c.ImageKey.Set {
		it.ImageKey = c.ImageKey.Value
	}
	if c.Status.Set {
		it.Status = c.Status.Value
	}
	it.UpdatedAt = time.Now().UTC()
	f.items[id] = it
	return &it, nil
}

// Delete removes the item.
func (f *Items) Delete(_ context.Context, id string) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.items[id]
	delete(f.items, id)
	return ok, nil
}

// CountImageReferences counts items using key.
func (f *Items) CountImageReferences(_ context.Context, key string) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, it := range f.items {
		if it.ImageKey != nil && *it.ImageKey == key {
			n++
		}
	}
	return n, nil
}

// Stats is not needed by the tests that use this fake.
func (f *Items) Stats(context.Context) (model.Stats, error) { return model.Stats{}, nil }

// StoredObject is an object held by Storage.
type StoredObject struct {
	Body        []byte
	ContentType string
}

// Storage is an in-memory object store.
type Storage struct {
	mu sync.Mutex
	// Objects maps key to stored object.
	Objects map[string]StoredObject
	// PublicBase mimics S3_PUBLIC_URL; empty means proxy URLs.
	PublicBase string
}

// NewStorage returns an empty Storage.
func NewStorage() *Storage { return &Storage{Objects: map[string]StoredObject{}} }

// Put stores the object.
func (s *Storage) Put(_ context.Context, key string, body io.Reader, _ int64, contentType string) error {
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Objects[key] = StoredObject{Body: data, ContentType: contentType}
	return nil
}

// Get opens the object or returns storage.ErrNotFound.
func (s *Storage) Get(_ context.Context, key string) (*storage.Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	obj, ok := s.Objects[key]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return &storage.Object{Body: io.NopCloser(bytes.NewReader(obj.Body)), ContentType: obj.ContentType, Size: int64(len(obj.Body))}, nil
}

// Delete removes the object.
func (s *Storage) Delete(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.Objects, key)
	return nil
}

// Has reports whether key is stored.
func (s *Storage) Has(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.Objects[key]
	return ok
}

// PublicURL mirrors storage.Storage.PublicURL.
func (s *Storage) PublicURL(key string) string {
	if s.PublicBase != "" {
		return s.PublicBase + "/" + key
	}
	return "/api/uploads/" + key
}
