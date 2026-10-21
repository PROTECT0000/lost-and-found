package handler

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"lost-and-found/backend/internal/imagetype"
	"lost-and-found/backend/internal/model"
)

// Field limits, mirroring the column sizes in the migration.
const (
	maxTitle       = 120
	maxDescription = 2000
	maxLocation    = 200
	maxContactName = 100
	maxContactInfo = 200
	maxResolvedBy  = 100
	maxResolution  = 500
	maxQuery       = 100
	defaultLimit   = 12
	maxLimit       = 100
)

// CreateItemRequest is the JSON body of POST /api/items.
type CreateItemRequest struct {
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Location    string `json:"location"`
	// OccurredAt is an RFC 3339 timestamp with a timezone, e.g. 2026-10-21T09:30:00+07:00.
	OccurredAt  string `json:"occurred_at"`
	ContactName string `json:"contact_name"`
	ContactInfo string `json:"contact_info"`
	// ImageKey is a key returned by POST /api/uploads; null or absent for no photo.
	ImageKey *string `json:"image_key"`
	// Status defaults to "open" when empty.
	Status string `json:"status"`
}

// UpdateItemRequest is the JSON body of PATCH /api/items/{id}. Only fields present in the JSON
// are changed.
type UpdateItemRequest struct {
	Type        model.Optional[string] `json:"type"`
	Title       model.Optional[string] `json:"title"`
	Description model.Optional[string] `json:"description"`
	Category    model.Optional[string] `json:"category"`
	Location    model.Optional[string] `json:"location"`
	OccurredAt  model.Optional[string] `json:"occurred_at"`
	ContactName model.Optional[string] `json:"contact_name"`
	ContactInfo model.Optional[string] `json:"contact_info"`
	// ImageKey set to null removes the photo.
	ImageKey model.Optional[*string] `json:"image_key"`
	Status   model.Optional[string]  `json:"status"`
	// ResolvedBy and ResolutionNote describe who took the item. They are only accepted together
	// with status "resolved"; reopening an item clears them.
	ResolvedBy     model.Optional[string] `json:"resolved_by"`
	ResolutionNote model.Optional[string] `json:"resolution_note"`
}

// validator collects issues while checking fields.
type validator struct {
	issues []Issue
}

func (v *validator) add(field, message string) {
	v.issues = append(v.issues, Issue{Field: field, Message: message})
}

// text trims s and checks it against required/max (max counts characters, not bytes).
func (v *validator) text(field, s string, required bool, max int) string {
	s = strings.TrimSpace(s)
	switch {
	case required && s == "":
		v.add(field, "Required")
	case utf8.RuneCountInString(s) > max:
		v.add(field, fmt.Sprintf("Must be at most %d characters", max))
	}
	return s
}

// optionalText trims s and returns nil when it is empty. allowed is false when the field may not
// be sent in this request (resolution details without status "resolved").
func (v *validator) optionalText(field, s string, max int, allowed bool) *string {
	if !allowed {
		v.add(field, `Only allowed together with status "resolved"`)
		return nil
	}
	s = v.text(field, s, false, max)
	if s == "" {
		return nil
	}
	return &s
}

func (v *validator) itemType(s string) model.ItemType {
	t := model.ItemType(s)
	if !t.Valid() {
		v.add("type", `Must be "lost" or "found"`)
	}
	return t
}

func (v *validator) status(s string) model.ItemStatus {
	st := model.ItemStatus(s)
	if !st.Valid() {
		v.add("status", `Must be "open" or "resolved"`)
	}
	return st
}

func (v *validator) category(s string) model.Category {
	c := model.Category(s)
	if !c.Valid() {
		v.add("category", "Unknown category")
	}
	return c
}

// occurredAt requires an RFC 3339 timestamp with an explicit timezone and returns it in UTC.
func (v *validator) occurredAt(s string) time.Time {
	t, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(s))
	if err != nil {
		v.add("occurred_at", "Must be an ISO 8601 date-time with timezone, e.g. 2026-10-21T09:30:00Z")
		return time.Time{}
	}
	return t.UTC()
}

func (v *validator) imageKey(key *string) *string {
	if key != nil && !imagetype.ValidKey(*key) {
		v.add("image_key", "Invalid image key")
	}
	return key
}

// Validate checks the request and converts it to a model.NewItem.
func (r CreateItemRequest) Validate() (model.NewItem, []Issue) {
	var v validator
	status := model.ItemStatusOpen
	if r.Status != "" {
		status = v.status(r.Status)
	}
	in := model.NewItem{
		Type:        v.itemType(r.Type),
		Title:       v.text("title", r.Title, true, maxTitle),
		Description: v.text("description", r.Description, false, maxDescription),
		Category:    v.category(r.Category),
		Location:    v.text("location", r.Location, true, maxLocation),
		OccurredAt:  v.occurredAt(r.OccurredAt),
		ContactName: v.text("contact_name", r.ContactName, true, maxContactName),
		ContactInfo: v.text("contact_info", r.ContactInfo, true, maxContactInfo),
		ImageKey:    v.imageKey(r.ImageKey),
		Status:      status,
	}
	return in, v.issues
}

// Validate checks the present fields and converts them to model.ItemChanges.
func (r UpdateItemRequest) Validate() (model.ItemChanges, []Issue) {
	var v validator
	var c model.ItemChanges
	if r.Type.Set {
		c.Type = model.Some(v.itemType(r.Type.Value))
	}
	if r.Title.Set {
		c.Title = model.Some(v.text("title", r.Title.Value, true, maxTitle))
	}
	if r.Description.Set {
		c.Description = model.Some(v.text("description", r.Description.Value, false, maxDescription))
	}
	if r.Category.Set {
		c.Category = model.Some(v.category(r.Category.Value))
	}
	if r.Location.Set {
		c.Location = model.Some(v.text("location", r.Location.Value, true, maxLocation))
	}
	if r.OccurredAt.Set {
		c.OccurredAt = model.Some(v.occurredAt(r.OccurredAt.Value))
	}
	if r.ContactName.Set {
		c.ContactName = model.Some(v.text("contact_name", r.ContactName.Value, true, maxContactName))
	}
	if r.ContactInfo.Set {
		c.ContactInfo = model.Some(v.text("contact_info", r.ContactInfo.Value, true, maxContactInfo))
	}
	if r.ImageKey.Set {
		c.ImageKey = model.Some(v.imageKey(r.ImageKey.Value))
	}
	if r.Status.Set {
		c.Status = model.Some(v.status(r.Status.Value))
	}
	resolving := c.Status.Set && c.Status.Value == model.ItemStatusResolved
	if r.ResolvedBy.Set {
		c.ResolvedBy = model.Some(v.optionalText("resolved_by", r.ResolvedBy.Value, maxResolvedBy, resolving))
	}
	if r.ResolutionNote.Set {
		c.ResolutionNote = model.Some(v.optionalText("resolution_note", r.ResolutionNote.Value, maxResolution, resolving))
	}
	if len(v.issues) == 0 && c.IsEmpty() {
		v.add("", "No fields to update")
	}
	return c, v.issues
}

// ParseItemFilter reads list filters and pagination from query parameters.
func ParseItemFilter(q url.Values) (model.ItemFilter, []Issue) {
	var v validator
	f := model.ItemFilter{Page: 1, Limit: defaultLimit}

	if s := q.Get("type"); s != "" {
		t := v.itemType(s)
		f.Type = &t
	}
	if s := q.Get("status"); s != "" {
		st := v.status(s)
		f.Status = &st
	}
	if s := q.Get("category"); s != "" {
		c := v.category(s)
		f.Category = &c
	}
	f.Query = v.text("q", q.Get("q"), false, maxQuery)
	f.ReportedFrom = v.optionalTime("from", q.Get("from"))
	f.ReportedTo = v.optionalTime("to", q.Get("to"))
	if f.ReportedFrom != nil && f.ReportedTo != nil && !f.ReportedTo.After(*f.ReportedFrom) {
		v.add("to", `Must be after "from"`)
	}
	f.Sort = model.SortCreatedAt
	if s := q.Get("sort"); s != "" {
		f.Sort = model.SortField(s)
		if !f.Sort.Valid() {
			v.add("sort", "Unknown sort column")
		}
	}
	switch q.Get("order") {
	case "", "desc":
	case "asc":
		f.Asc = true
	default:
		v.add("order", `Must be "asc" or "desc"`)
	}
	f.Page = v.intParam("page", q.Get("page"), 1, 1, 0)
	f.Limit = v.intParam("limit", q.Get("limit"), defaultLimit, 1, maxLimit)
	return f, v.issues
}

// optionalTime parses an RFC 3339 timestamp with a timezone; "" means not set.
func (v *validator) optionalTime(field, s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		v.add(field, "Must be an ISO 8601 date-time with timezone, e.g. 2026-10-01T00:00:00+07:00")
		return nil
	}
	t = t.UTC()
	return &t
}

// intParam parses an integer query parameter; max 0 means no upper bound.
func (v *validator) intParam(field, s string, def, min, max int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	switch {
	case err != nil:
		v.add(field, "Must be a whole number")
	case n < min:
		v.add(field, fmt.Sprintf("Must be at least %d", min))
	case max > 0 && n > max:
		v.add(field, fmt.Sprintf("Must be at most %d", max))
	}
	return n
}
