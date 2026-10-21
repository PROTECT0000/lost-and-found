package repository_test

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"

	"lost-and-found/backend/internal/database"
	"lost-and-found/backend/internal/model"
	"lost-and-found/backend/internal/repository"
	"lost-and-found/backend/migrations"
)

// These tests need a real MySQL database. They run only when TEST_DATABASE_DSN is set, and only
// against a database whose name ends in "_test", because they empty the items table.
var testDB *sqlx.DB

func TestMain(m *testing.M) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		fmt.Println("repository tests skipped: TEST_DATABASE_DSN not set")
		os.Exit(0)
	}
	cfg, err := database.ConfigFromDSN(dsn)
	if err != nil || !strings.HasSuffix(cfg.DBName, "_test") {
		fmt.Println("refusing to run: TEST_DATABASE_DSN must point to a database named *_test")
		os.Exit(1)
	}
	testDB, err = database.Open(context.Background(), dsn)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	goose.SetBaseFS(migrations.FS)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("mysql"); err != nil {
		panic(err)
	}
	if err := goose.Up(testDB.DB, "."); err != nil {
		fmt.Println("migrate:", err)
		os.Exit(1)
	}
	code := m.Run()
	_ = testDB.Close()
	os.Exit(code)
}

func newRepo(t *testing.T) *repository.ItemRepository {
	t.Helper()
	if _, err := testDB.Exec("TRUNCATE TABLE items"); err != nil {
		t.Fatal(err)
	}
	return repository.NewItemRepository(testDB)
}

func newItem(mod func(*model.NewItem)) model.NewItem {
	in := model.NewItem{
		Type: model.ItemTypeLost, Title: "Wallet", Category: model.CategoryWallet, Location: "Library",
		OccurredAt: time.Date(2026, 10, 20, 8, 0, 0, 0, time.UTC), ContactName: "Rina", ContactInfo: "rina@example.com",
		Status: model.ItemStatusOpen,
	}
	if mod != nil {
		mod(&in)
	}
	return in
}

func mustCreate(t *testing.T, r *repository.ItemRepository, mod func(*model.NewItem)) *model.Item {
	t.Helper()
	item, err := r.Create(context.Background(), newItem(mod))
	if err != nil {
		t.Fatal(err)
	}
	return item
}

func ptr[T any](v T) *T { return &v }

func titles(items []model.Item) string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Title
	}
	return strings.Join(out, ",")
}

func list(t *testing.T, r *repository.ItemRepository, f model.ItemFilter) ([]model.Item, int) {
	t.Helper()
	if f.Page == 0 {
		f.Page = 1
	}
	if f.Limit == 0 {
		f.Limit = 12
	}
	items, total, err := r.List(context.Background(), f)
	if err != nil {
		t.Fatal(err)
	}
	return items, total
}

func seedThree(t *testing.T, r *repository.ItemRepository) {
	mustCreate(t, r, func(in *model.NewItem) { in.Title, in.Location = "Black wallet", "Library" })
	mustCreate(t, r, func(in *model.NewItem) {
		in.Type, in.Title, in.Category, in.Description = model.ItemTypeFound, "Keys", model.CategoryKeys, "blue keychain"
	})
	mustCreate(t, r, func(in *model.NewItem) {
		in.Type, in.Title, in.Category, in.Location, in.Status = model.ItemTypeFound, "Umbrella", model.CategoryOther, "Bus stop", model.ItemStatusResolved
	})
}

func TestCreateRoundTripsAllFieldsInUTC(t *testing.T) {
	r := newRepo(t)
	occurred := time.Date(2026, 10, 21, 9, 30, 15, 123e6, time.FixedZone("WIB", 7*3600))
	item := mustCreate(t, r, func(in *model.NewItem) {
		in.OccurredAt = occurred
		in.ImageKey = ptr("items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.png")
	})
	if !item.OccurredAt.Equal(occurred) || item.OccurredAt.Location() != time.UTC {
		t.Errorf("OccurredAt = %v, want %v in UTC (millisecond precision kept)", item.OccurredAt, occurred)
	}
	if item.CreatedAt.IsZero() || time.Since(item.CreatedAt).Abs() > time.Minute {
		t.Errorf("CreatedAt = %v, want ~now in UTC (time_zone forced to +00:00)", item.CreatedAt)
	}
	if item.ImageKey == nil || item.Description != "" || item.Status != model.ItemStatusOpen {
		t.Errorf("unexpected item: %+v", item)
	}
}

func TestListFilters(t *testing.T) {
	r := newRepo(t)
	seedThree(t, r)
	found, open := model.ItemTypeFound, model.ItemStatusOpen
	keys, lost := model.CategoryKeys, model.ItemTypeLost

	if _, total := list(t, r, model.ItemFilter{Type: &found}); total != 2 {
		t.Errorf("type=found total %d, want 2", total)
	}
	if items, _ := list(t, r, model.ItemFilter{Type: &found, Status: &open}); titles(items) != "Keys" {
		t.Errorf("found+open = %s", titles(items))
	}
	if _, total := list(t, r, model.ItemFilter{Type: &lost, Category: &keys}); total != 0 {
		t.Errorf("lost+keys total %d, want 0", total)
	}
}

func TestListSearch(t *testing.T) {
	r := newRepo(t)
	seedThree(t, r)
	for q, want := range map[string]string{"wallet": "Black wallet", "KEYCHAIN": "Keys", "bus": "Umbrella"} {
		if items, _ := list(t, r, model.ItemFilter{Query: q}); titles(items) != want {
			t.Errorf("q=%q: got %s, want %s", q, titles(items), want)
		}
	}
	// "l" matches all three; the type filter must still apply to every search column (AND vs OR).
	lost := model.ItemTypeLost
	if items, total := list(t, r, model.ItemFilter{Query: "l", Type: &lost}); total != 1 || titles(items) != "Black wallet" {
		t.Errorf("search+filter: %d %s", total, titles(items))
	}
}

func TestListSearchTreatsWildcardsAndQuotesLiterally(t *testing.T) {
	r := newRepo(t)
	seedThree(t, r)
	mustCreate(t, r, func(in *model.NewItem) { in.Title = "100% cotton scarf" })
	mustCreate(t, r, func(in *model.NewItem) { in.Title = "file_name card" })

	for q, want := range map[string]int{"%": 1, "_": 1, "100%": 1, "!": 0, `' OR 1=1 --`: 0, `\`: 0} {
		if _, total := list(t, r, model.ItemFilter{Query: q}); total != want {
			t.Errorf("q=%q: total %d, want %d", q, total, want)
		}
	}
}

func TestListPagination(t *testing.T) {
	r := newRepo(t)
	seedThree(t, r)
	page1, total := list(t, r, model.ItemFilter{Page: 1, Limit: 2})
	page2, _ := list(t, r, model.ItemFilter{Page: 2, Limit: 2})
	if total != 3 || len(page1) != 2 || len(page2) != 1 {
		t.Fatalf("total %d, page sizes %d/%d", total, len(page1), len(page2))
	}
	seen := map[string]bool{}
	for _, it := range append(page1, page2...) {
		seen[it.ID] = true
	}
	if len(seen) != 3 {
		t.Error("pages overlap")
	}
	if items, _ := list(t, r, model.ItemFilter{Page: 5, Limit: 2}); len(items) != 0 {
		t.Error("page past the end should be empty, not nil-error")
	}
}

func TestListNewestFirst(t *testing.T) {
	r := newRepo(t)
	seedThree(t, r)
	if _, err := testDB.Exec("UPDATE items SET created_at = '2020-01-01 00:00:00' WHERE title = 'Keys'"); err != nil {
		t.Fatal(err)
	}
	if items, _ := list(t, r, model.ItemFilter{}); items[len(items)-1].Title != "Keys" {
		t.Errorf("order = %s", titles(items))
	}
}

func TestUpdateChangesOnlyGivenFields(t *testing.T) {
	r := newRepo(t)
	created := mustCreate(t, r, func(in *model.NewItem) { in.Description, in.Status = "Brown leather", model.ItemStatusResolved })
	updated, err := r.Update(context.Background(), created.ID, model.ItemChanges{Title: model.Some("Renamed")})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Title != "Renamed" || updated.Description != "Brown leather" || updated.Status != model.ItemStatusResolved {
		t.Errorf("got %+v", updated)
	}
}

func TestUpdateClearsImageKey(t *testing.T) {
	r := newRepo(t)
	created := mustCreate(t, r, func(in *model.NewItem) { in.ImageKey = ptr("items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.png") })
	updated, err := r.Update(context.Background(), created.ID, model.ItemChanges{ImageKey: model.Some[*string](nil)})
	if err != nil || updated.ImageKey != nil {
		t.Errorf("err %v, image_key %v", err, updated.ImageKey)
	}
}

// Without clientFoundRows MySQL reports 0 affected rows when nothing changes, which would be
// misread as "not found".
func TestUpdateWithUnchangedValuesIsNotNotFound(t *testing.T) {
	r := newRepo(t)
	created := mustCreate(t, r, nil)
	if _, err := r.Update(context.Background(), created.ID, model.ItemChanges{Title: model.Some(created.Title)}); err != nil {
		t.Fatalf("err = %v", err)
	}
}

func TestUpdateBumpsUpdatedAtOnly(t *testing.T) {
	r := newRepo(t)
	created := mustCreate(t, r, nil)
	if _, err := testDB.Exec("UPDATE items SET created_at = '2020-01-01 00:00:00', updated_at = '2020-01-01 00:00:00'"); err != nil {
		t.Fatal(err)
	}
	updated, err := r.Update(context.Background(), created.ID, model.ItemChanges{Title: model.Some(created.Title)})
	if err != nil {
		t.Fatal(err)
	}
	old := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	if !updated.CreatedAt.Equal(old) || updated.UpdatedAt.Equal(old) {
		t.Errorf("created_at %v, updated_at %v", updated.CreatedAt, updated.UpdatedAt)
	}
}

func TestMissingItems(t *testing.T) {
	r := newRepo(t)
	ctx := context.Background()
	if _, err := r.Get(ctx, "missing"); err != repository.ErrNotFound {
		t.Errorf("Get: %v", err)
	}
	if _, err := r.Update(ctx, "missing", model.ItemChanges{Title: model.Some("x")}); err != repository.ErrNotFound {
		t.Errorf("Update: %v", err)
	}
	if ok, err := r.Delete(ctx, "missing"); ok || err != nil {
		t.Errorf("Delete: %v %v", ok, err)
	}
}

func TestCountImageReferences(t *testing.T) {
	r := newRepo(t)
	key := "items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.png"
	ctx := context.Background()
	if n, _ := r.CountImageReferences(ctx, key); n != 0 {
		t.Errorf("before: %d", n)
	}
	mustCreate(t, r, func(in *model.NewItem) { in.ImageKey = &key })
	mustCreate(t, r, func(in *model.NewItem) { in.ImageKey = &key })
	if n, _ := r.CountImageReferences(ctx, key); n != 2 {
		t.Errorf("after: %d", n)
	}
}

func TestStats(t *testing.T) {
	r := newRepo(t)
	ctx := context.Background()
	empty, err := r.Stats(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if empty.Total != 0 || empty.Open != 0 || empty.ByCategory == nil || len(empty.ByCategory) != 0 {
		t.Errorf("empty stats = %+v (byCategory must be [] not null)", empty)
	}

	mustCreate(t, r, nil)
	mustCreate(t, r, func(in *model.NewItem) {
		in.Type, in.Category, in.Status = model.ItemTypeFound, model.CategoryKeys, model.ItemStatusResolved
	})
	mustCreate(t, r, func(in *model.NewItem) { in.Type, in.Category = model.ItemTypeFound, model.CategoryKeys })
	s, err := r.Stats(ctx)
	if err != nil {
		t.Fatal(err)
	}
	got := fmt.Sprintf("%d %d %d %d %d %v", s.Total, s.Open, s.Resolved, s.Lost, s.Found, s.ByCategory)
	if want := "3 2 1 1 2 [{keys 2} {wallet 1}]"; got != want {
		t.Errorf("stats = %s, want %s", got, want)
	}
}
