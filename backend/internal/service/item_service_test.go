package service_test

import (
	"context"
	"testing"
	"time"

	"lost-and-found/backend/internal/model"
	"lost-and-found/backend/internal/service"
	"lost-and-found/backend/internal/testfake"
)

func setup(t *testing.T) (*service.ItemService, *testfake.Items, *testfake.Storage, *[]string) {
	t.Helper()
	items, store := testfake.NewItems(), testfake.NewStorage()
	var results []string
	svc := service.NewItemService(items, store, func(r string) { results = append(results, r) })
	return svc, items, store, &results
}

func createWithImage(t *testing.T, svc *service.ItemService, store *testfake.Storage, key string) *model.Item {
	t.Helper()
	store.Objects[key] = testfake.StoredObject{Body: []byte("img")}
	item, err := svc.Create(context.Background(), model.NewItem{
		Type: model.ItemTypeLost, Title: "Wallet", Category: model.CategoryWallet, Location: "Library",
		OccurredAt: time.Now(), ContactName: "Rina", ContactInfo: "rina@example.com",
		ImageKey: &key, Status: model.ItemStatusOpen,
	})
	if err != nil {
		t.Fatal(err)
	}
	return item
}

const (
	keyA = "items/00000000-0000-4000-8000-00000000000a.png"
	keyB = "items/00000000-0000-4000-8000-00000000000b.png"
)

func TestReplacingImageDeletesOldOne(t *testing.T) {
	svc, _, store, results := setup(t)
	item := createWithImage(t, svc, store, keyA)
	store.Objects[keyB] = testfake.StoredObject{}

	newKey := keyB
	if _, err := svc.Update(context.Background(), item.ID, model.ItemChanges{ImageKey: model.Some(&newKey)}); err != nil {
		t.Fatal(err)
	}
	if store.Has(keyA) || !store.Has(keyB) {
		t.Errorf("old image kept=%v, new image kept=%v; want false, true", store.Has(keyA), store.Has(keyB))
	}
	if len(*results) != 1 || (*results)[0] != "deleted" {
		t.Errorf("cleanup results = %v", *results)
	}
}

func TestRemovingImageDeletesIt(t *testing.T) {
	svc, _, store, _ := setup(t)
	item := createWithImage(t, svc, store, keyA)
	if _, err := svc.Update(context.Background(), item.ID, model.ItemChanges{ImageKey: model.Some[*string](nil)}); err != nil {
		t.Fatal(err)
	}
	if store.Has(keyA) {
		t.Error("removed image should be deleted")
	}
}

func TestUpdatingOtherFieldsKeepsImage(t *testing.T) {
	svc, _, store, results := setup(t)
	item := createWithImage(t, svc, store, keyA)
	ctx := context.Background()

	if _, err := svc.Update(ctx, item.ID, model.ItemChanges{Status: model.Some(model.ItemStatusResolved)}); err != nil {
		t.Fatal(err)
	}
	same := keyA // re-sending the same key is not a replacement
	if _, err := svc.Update(ctx, item.ID, model.ItemChanges{ImageKey: model.Some(&same)}); err != nil {
		t.Fatal(err)
	}
	if !store.Has(keyA) {
		t.Error("image must be kept")
	}
	if len(*results) != 0 {
		t.Errorf("no cleanup expected, got %v", *results)
	}
}

func TestDeleteRemovesImage(t *testing.T) {
	svc, _, store, _ := setup(t)
	item := createWithImage(t, svc, store, keyA)
	if err := svc.Delete(context.Background(), item.ID); err != nil {
		t.Fatal(err)
	}
	if store.Has(keyA) {
		t.Error("image of a deleted item should be deleted")
	}
}

func TestSharedImageIsKept(t *testing.T) {
	svc, _, store, results := setup(t)
	doomed := createWithImage(t, svc, store, keyA)
	createWithImage(t, svc, store, keyA)

	if err := svc.Delete(context.Background(), doomed.ID); err != nil {
		t.Fatal(err)
	}
	if !store.Has(keyA) {
		t.Error("image still used by another item must be kept")
	}
	if len(*results) != 1 || (*results)[0] != "kept" {
		t.Errorf("cleanup results = %v", *results)
	}
}

func TestMissingItem(t *testing.T) {
	svc, _, _, _ := setup(t)
	ctx := context.Background()
	if _, err := svc.Update(ctx, "missing", model.ItemChanges{Title: model.Some("x")}); !service.IsNotFound(err) {
		t.Errorf("Update: err = %v, want not found", err)
	}
	if err := svc.Delete(ctx, "missing"); !service.IsNotFound(err) {
		t.Errorf("Delete: err = %v, want not found", err)
	}
}
