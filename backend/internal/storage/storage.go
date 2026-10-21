// Package storage stores images in S3-compatible object storage using minio-go.
package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"lost-and-found/backend/internal/config"
)

// ErrNotFound is returned when an object does not exist.
var ErrNotFound = errors.New("object not found")

// Object is a stored object opened for reading. The caller must close Body.
type Object struct {
	Body        io.ReadCloser
	ContentType string
	Size        int64
}

// Storage is an S3-compatible bucket.
type Storage struct {
	client *minio.Client
	bucket string
	// publicURL is the optional public base URL (no trailing slash); empty means proxy via the API.
	publicURL string
}

// New creates a Storage from cfg. It does not contact the server; use Ping for that.
func New(cfg config.S3Config) (*Storage, error) {
	endpoint, err := url.Parse(cfg.Endpoint)
	if err != nil || endpoint.Host == "" {
		return nil, fmt.Errorf("storage: S3_ENDPOINT must be a URL like http://host:port, got %q", cfg.Endpoint)
	}
	client, err := minio.New(endpoint.Host, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		Secure: endpoint.Scheme == "https",
		Region: cfg.Region,
		// Path-style ({endpoint}/{bucket}/{key}) works with R2, MinIO, SeaweedFS and AWS regional endpoints.
		BucketLookup: minio.BucketLookupPath,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: %w", err)
	}
	return &Storage{client: client, bucket: cfg.Bucket, publicURL: strings.TrimRight(cfg.PublicURL, "/")}, nil
}

// Put uploads size bytes from body under key.
func (s *Storage) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, body, size, minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return fmt.Errorf("storage: put %s: %w", key, err)
	}
	return nil
}

// Get opens the object at key, or returns ErrNotFound.
func (s *Storage) Get(ctx context.Context, key string) (*Object, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("storage: get %s: %w", key, err)
	}
	// GetObject is lazy; Stat performs the request and surfaces "not found".
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		if minio.ToErrorResponse(err).Code == minio.NoSuchKey {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("storage: stat %s: %w", key, err)
	}
	return &Object{Body: obj, ContentType: info.ContentType, Size: info.Size}, nil
}

// Delete removes the object at key. Deleting a missing object is not an error.
func (s *Storage) Delete(ctx context.Context, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("storage: delete %s: %w", key, err)
	}
	return nil
}

// PublicURL returns the URL clients use to load the object: the public base URL when configured,
// otherwise the API proxy path /api/uploads/<key>.
func (s *Storage) PublicURL(key string) string {
	if s.publicURL != "" {
		return s.publicURL + "/" + key
	}
	return "/api/uploads/" + key
}

// Ping checks that the bucket exists and is reachable with the configured credentials.
func (s *Storage) Ping(ctx context.Context) error {
	ok, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("storage: %w", err)
	}
	if !ok {
		return fmt.Errorf("storage: bucket %q does not exist", s.bucket)
	}
	return nil
}
