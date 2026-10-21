package handler_test

import (
	"encoding/json"
	"net/url"
	"strings"
	"testing"
	"time"

	"lost-and-found/backend/internal/handler"
	"lost-and-found/backend/internal/model"
)

const validKey = "items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.webp"

func validCreate() handler.CreateItemRequest {
	return handler.CreateItemRequest{
		Type: "lost", Title: "Wallet", Category: "wallet", Location: "Library",
		OccurredAt: "2026-10-20T08:00:00Z", ContactName: "Rina", ContactInfo: "rina@example.com",
	}
}

func issueFields(issues []handler.Issue) []string {
	fields := make([]string, len(issues))
	for i, is := range issues {
		fields[i] = is.Field
	}
	return fields
}

func decodeUpdate(t *testing.T, body string) handler.UpdateItemRequest {
	t.Helper()
	var req handler.UpdateItemRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatal(err)
	}
	return req
}

// Regression for the TypeScript version, where defaults were re-applied on PATCH and every update
// reset status to "open" and wiped the description.
func TestUpdateOnlyContainsSentFields(t *testing.T) {
	changes, issues := decodeUpdate(t, `{"title": "  New title  "}`).Validate()
	if len(issues) > 0 {
		t.Fatalf("unexpected issues: %+v", issues)
	}
	want := model.ItemChanges{Title: model.Some("New title")}
	if changes != want {
		t.Errorf("changes = %+v, want only the title", changes)
	}
}

func TestUpdateImageKeyNullVersusAbsent(t *testing.T) {
	cleared, _ := decodeUpdate(t, `{"image_key": null}`).Validate()
	if !cleared.ImageKey.Set || cleared.ImageKey.Value != nil {
		t.Errorf("null image_key: got %+v, want set to nil", cleared.ImageKey)
	}
	untouched, _ := decodeUpdate(t, `{"status": "resolved"}`).Validate()
	if untouched.ImageKey.Set {
		t.Error("absent image_key must not be set")
	}
}

func TestUpdateRejectsEmptyBody(t *testing.T) {
	if _, issues := decodeUpdate(t, `{}`).Validate(); len(issues) == 0 {
		t.Fatal("expected an issue for an empty update")
	}
}

func TestUpdateRejectsClearingRequiredText(t *testing.T) {
	_, issues := decodeUpdate(t, `{"title": "   "}`).Validate()
	if got := issueFields(issues); len(got) != 1 || got[0] != "title" {
		t.Errorf("issues = %v, want [title]", got)
	}
}

func TestCreateDefaultsAndTrimming(t *testing.T) {
	req := validCreate()
	req.Title = "  Wallet  "
	in, issues := req.Validate()
	if len(issues) > 0 {
		t.Fatalf("unexpected issues: %+v", issues)
	}
	if in.Title != "Wallet" || in.Status != model.ItemStatusOpen || in.Description != "" {
		t.Errorf("got title %q status %q description %q", in.Title, in.Status, in.Description)
	}
}

func TestCreateRequiredFields(t *testing.T) {
	req := handler.CreateItemRequest{Type: "lost", Category: "wallet", Title: " ", Location: "\n",
		OccurredAt: "2026-10-20T08:00:00Z", ContactName: "", ContactInfo: "  "}
	_, issues := req.Validate()
	got := strings.Join(issueFields(issues), ",")
	if got != "title,location,contact_name,contact_info" {
		t.Errorf("issue fields = %s", got)
	}
}

func TestCreateLengthLimitsCountCharactersNotBytes(t *testing.T) {
	req := validCreate()
	req.Title = strings.Repeat("é", 120) // 240 bytes, 120 characters
	if _, issues := req.Validate(); len(issues) > 0 {
		t.Errorf("120 multi-byte characters should be allowed: %+v", issues)
	}
	req.Title = strings.Repeat("a", 121)
	if _, issues := req.Validate(); len(issues) != 1 {
		t.Errorf("121 characters should be rejected, got %+v", issues)
	}
}

func TestOccurredAtNormalizedToUTC(t *testing.T) {
	req := validCreate()
	req.OccurredAt = "2026-10-21T09:30:00+07:00"
	in, issues := req.Validate()
	if len(issues) > 0 {
		t.Fatal(issues)
	}
	want := time.Date(2026, 10, 21, 2, 30, 0, 0, time.UTC)
	if !in.OccurredAt.Equal(want) || in.OccurredAt.Location() != time.UTC {
		t.Errorf("OccurredAt = %v, want %v in UTC", in.OccurredAt, want)
	}
}

func TestOccurredAtRequiresDateTimeWithZone(t *testing.T) {
	for _, value := range []string{"2026-10-21", "2026-10-21T09:30:00", "yesterday", ""} {
		req := validCreate()
		req.OccurredAt = value
		if _, issues := req.Validate(); len(issues) != 1 || issues[0].Field != "occurred_at" {
			t.Errorf("%q: issues = %+v, want one occurred_at issue", value, issues)
		}
	}
}

func TestCreateImageKey(t *testing.T) {
	req := validCreate()
	key := validKey
	req.ImageKey = &key
	if _, issues := req.Validate(); len(issues) > 0 {
		t.Errorf("valid key rejected: %+v", issues)
	}
	bad := "../etc/passwd"
	req.ImageKey = &bad
	if _, issues := req.Validate(); len(issues) != 1 || issues[0].Field != "image_key" {
		t.Errorf("bad key: issues = %+v", issues)
	}
}

func TestCreateRejectsUnknownEnums(t *testing.T) {
	req := validCreate()
	req.Type, req.Category, req.Status = "stolen", "cars", "closed"
	_, issues := req.Validate()
	if got := strings.Join(issueFields(issues), ","); got != "status,type,category" {
		t.Errorf("issue fields = %s", got)
	}
}

func TestParseItemFilter(t *testing.T) {
	f, issues := handler.ParseItemFilter(url.Values{})
	if len(issues) > 0 || f.Page != 1 || f.Limit != 12 || f.Type != nil {
		t.Fatalf("defaults: %+v %+v", f, issues)
	}

	f, issues = handler.ParseItemFilter(url.Values{"page": {"3"}, "limit": {"24"}, "type": {"found"}, "q": {" keys "}})
	if len(issues) > 0 || f.Page != 3 || f.Limit != 24 || *f.Type != model.ItemTypeFound || f.Query != "keys" {
		t.Fatalf("parsed: %+v %+v", f, issues)
	}
	if f.Offset() != 48 {
		t.Errorf("Offset() = %d, want 48", f.Offset())
	}

	for _, q := range []url.Values{
		{"page": {"0"}}, {"page": {"1.5"}}, {"page": {"abc"}}, {"limit": {"0"}}, {"limit": {"101"}},
		{"type": {"stolen"}}, {"status": {"closed"}}, {"category": {"cars"}},
	} {
		if _, issues := handler.ParseItemFilter(q); len(issues) == 0 {
			t.Errorf("%v: expected a validation issue", q)
		}
	}
}
