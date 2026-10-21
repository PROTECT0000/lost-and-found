// Package repository implements data access with sqlx.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"lost-and-found/backend/internal/model"
)

// ErrNotFound is returned when an item does not exist.
var ErrNotFound = errors.New("item not found")

const itemColumns = `id, type, title, description, category, location, occurred_at,
	contact_name, contact_info, image_key, status, created_at, updated_at`

// ItemRepository reads and writes items in MySQL.
type ItemRepository struct {
	db *sqlx.DB
}

// NewItemRepository returns an ItemRepository using db.
func NewItemRepository(db *sqlx.DB) *ItemRepository {
	return &ItemRepository{db: db}
}

// List returns one page of items matching f, newest first, plus the total number of matches.
func (r *ItemRepository) List(ctx context.Context, f model.ItemFilter) ([]model.Item, int, error) {
	where, args := buildItemWhere(f)

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM items"+where, args...); err != nil {
		return nil, 0, fmt.Errorf("count items: %w", err)
	}

	items := []model.Item{}
	query := "SELECT " + itemColumns + " FROM items" + where + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
	if err := r.db.SelectContext(ctx, &items, query, append(args, f.Limit, f.Offset())...); err != nil {
		return nil, 0, fmt.Errorf("list items: %w", err)
	}
	return items, total, nil
}

// buildItemWhere builds the WHERE clause for f. Only fixed column names are interpolated;
// every value is passed as a placeholder argument.
func buildItemWhere(f model.ItemFilter) (string, []any) {
	var conds []string
	var args []any
	if f.Type != nil {
		conds = append(conds, "type = ?")
		args = append(args, *f.Type)
	}
	if f.Status != nil {
		conds = append(conds, "status = ?")
		args = append(args, *f.Status)
	}
	if f.Category != nil {
		conds = append(conds, "category = ?")
		args = append(args, *f.Category)
	}
	if f.Query != "" {
		like := "%" + escapeLike(f.Query) + "%"
		conds = append(conds, "(title LIKE ? ESCAPE '!' OR description LIKE ? ESCAPE '!' OR location LIKE ? ESCAPE '!')")
		args = append(args, like, like, like)
	}
	if len(conds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

// escapeLike escapes LIKE wildcards so the search term matches literally.
// '!' is used as the escape character because backslash handling depends on the SQL mode.
func escapeLike(s string) string {
	return strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(s)
}

// Get returns the item with the given id, or ErrNotFound.
func (r *ItemRepository) Get(ctx context.Context, id string) (*model.Item, error) {
	var item model.Item
	err := r.db.GetContext(ctx, &item, "SELECT "+itemColumns+" FROM items WHERE id = ?", id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get item: %w", err)
	}
	return &item, nil
}

// Create inserts a new item and returns it as stored.
func (r *ItemRepository) Create(ctx context.Context, in model.NewItem) (*model.Item, error) {
	id := uuid.NewString()
	_, err := r.db.ExecContext(ctx, `INSERT INTO items
		(id, type, title, description, category, location, occurred_at, contact_name, contact_info, image_key, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, in.Type, in.Title, in.Description, in.Category, in.Location, in.OccurredAt.UTC(),
		in.ContactName, in.ContactInfo, in.ImageKey, in.Status)
	if err != nil {
		return nil, fmt.Errorf("create item: %w", err)
	}
	return r.Get(ctx, id)
}

// Update writes the fields set in c and returns the updated item, or ErrNotFound.
// updated_at is refreshed by the column's ON UPDATE clause.
func (r *ItemRepository) Update(ctx context.Context, id string, c model.ItemChanges) (*model.Item, error) {
	sets, args := buildItemSet(c)
	if len(sets) == 0 {
		return r.Get(ctx, id)
	}
	// Force updated_at even when every value is unchanged (ON UPDATE only fires on real changes).
	sets = append(sets, "updated_at = CURRENT_TIMESTAMP(3)")

	res, err := r.db.ExecContext(ctx, "UPDATE items SET "+strings.Join(sets, ", ")+" WHERE id = ?", append(args, id)...)
	if err != nil {
		return nil, fmt.Errorf("update item: %w", err)
	}
	// Relies on clientFoundRows (see database.Open): counts matched rows, not changed rows.
	if n, err := res.RowsAffected(); err == nil && n == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, id)
}

// buildItemSet builds SET clauses for the fields present in c.
func buildItemSet(c model.ItemChanges) ([]string, []any) {
	var sets []string
	var args []any
	add := func(column string, value any) {
		sets = append(sets, column+" = ?")
		args = append(args, value)
	}
	if c.Type.Set {
		add("type", c.Type.Value)
	}
	if c.Title.Set {
		add("title", c.Title.Value)
	}
	if c.Description.Set {
		add("description", c.Description.Value)
	}
	if c.Category.Set {
		add("category", c.Category.Value)
	}
	if c.Location.Set {
		add("location", c.Location.Value)
	}
	if c.OccurredAt.Set {
		add("occurred_at", c.OccurredAt.Value.UTC())
	}
	if c.ContactName.Set {
		add("contact_name", c.ContactName.Value)
	}
	if c.ContactInfo.Set {
		add("contact_info", c.ContactInfo.Value)
	}
	if c.ImageKey.Set {
		add("image_key", c.ImageKey.Value)
	}
	if c.Status.Set {
		add("status", c.Status.Value)
	}
	return sets, args
}

// Delete removes the item and reports whether it existed.
func (r *ItemRepository) Delete(ctx context.Context, id string) (bool, error) {
	res, err := r.db.ExecContext(ctx, "DELETE FROM items WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete item: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("delete item: %w", err)
	}
	return n > 0, nil
}

// CountImageReferences returns how many items use the given image key.
func (r *ItemRepository) CountImageReferences(ctx context.Context, key string) (int, error) {
	var n int
	if err := r.db.GetContext(ctx, &n, "SELECT COUNT(*) FROM items WHERE image_key = ?", key); err != nil {
		return 0, fmt.Errorf("count image references: %w", err)
	}
	return n, nil
}

// Stats returns totals for the admin dashboard.
func (r *ItemRepository) Stats(ctx context.Context) (model.Stats, error) {
	var s model.Stats
	// SUM() returns NULL on an empty table, hence COALESCE; CAST avoids DECIMAL results.
	err := r.db.GetContext(ctx, &s, `SELECT
		COUNT(*) AS total,
		CAST(COALESCE(SUM(status = 'open'), 0) AS SIGNED) AS open,
		CAST(COALESCE(SUM(status = 'resolved'), 0) AS SIGNED) AS resolved,
		CAST(COALESCE(SUM(type = 'lost'), 0) AS SIGNED) AS lost,
		CAST(COALESCE(SUM(type = 'found'), 0) AS SIGNED) AS found
		FROM items`)
	if err != nil {
		return s, fmt.Errorf("stats: %w", err)
	}
	s.ByCategory = []model.CategoryCount{}
	err = r.db.SelectContext(ctx, &s.ByCategory,
		"SELECT category, COUNT(*) AS count FROM items GROUP BY category ORDER BY count DESC, category")
	if err != nil {
		return s, fmt.Errorf("stats by category: %w", err)
	}
	return s, nil
}

// Ping checks that the database is reachable.
func (r *ItemRepository) Ping(ctx context.Context) error {
	return r.db.PingContext(ctx)
}
