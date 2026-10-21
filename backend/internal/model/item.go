// Package model contains the domain types shared across layers.
package model

import "time"

// ItemType tells whether an item was lost or found.
type ItemType string

// Item types.
const (
	ItemTypeLost  ItemType = "lost"
	ItemTypeFound ItemType = "found"
)

// Valid reports whether t is a known item type.
func (t ItemType) Valid() bool { return t == ItemTypeLost || t == ItemTypeFound }

// ItemStatus tells whether an item report is still open or has been resolved (returned to its owner).
type ItemStatus string

// Item statuses.
const (
	ItemStatusOpen     ItemStatus = "open"
	ItemStatusResolved ItemStatus = "resolved"
)

// Valid reports whether s is a known item status.
func (s ItemStatus) Valid() bool { return s == ItemStatusOpen || s == ItemStatusResolved }

// Category groups items by kind.
type Category string

// Item categories.
const (
	CategoryElectronics Category = "electronics"
	CategoryWallet      Category = "wallet"
	CategoryKeys        Category = "keys"
	CategoryBag         Category = "bag"
	CategoryClothing    Category = "clothing"
	CategoryDocuments   Category = "documents"
	CategoryJewelry     Category = "jewelry"
	CategoryOther       Category = "other"
)

// Categories lists every valid category.
var Categories = []Category{
	CategoryElectronics, CategoryWallet, CategoryKeys, CategoryBag,
	CategoryClothing, CategoryDocuments, CategoryJewelry, CategoryOther,
}

// Valid reports whether c is a known category.
func (c Category) Valid() bool {
	for _, known := range Categories {
		if c == known {
			return true
		}
	}
	return false
}

// Item is a lost or found item report.
type Item struct {
	ID          string   `db:"id" json:"id"`
	Type        ItemType `db:"type" json:"type"`
	Title       string   `db:"title" json:"title"`
	Description string   `db:"description" json:"description"`
	Category    Category `db:"category" json:"category"`
	Location    string   `db:"location" json:"location"`
	// OccurredAt is when the item was lost or found, always in UTC.
	OccurredAt  time.Time `db:"occurred_at" json:"occurred_at"`
	ContactName string    `db:"contact_name" json:"contact_name"`
	// ContactInfo is free text: an email address or phone number.
	ContactInfo string `db:"contact_info" json:"contact_info"`
	// ImageKey is the object key in S3 storage (items/<uuid>.<ext>); nil when there is no photo.
	ImageKey *string `db:"image_key" json:"image_key"`
	// ImageURL is derived from ImageKey when building API responses; it is never stored.
	ImageURL *string    `db:"-" json:"image_url"`
	Status   ItemStatus `db:"status" json:"status"`
	// ResolvedBy names who collected or claimed the item; nil unless resolved.
	ResolvedBy     *string `db:"resolved_by" json:"resolved_by"`
	ResolutionNote *string `db:"resolution_note" json:"resolution_note"`
	// ResolvedAt is when the item was marked resolved, in UTC; nil while open.
	ResolvedAt *time.Time `db:"resolved_at" json:"resolved_at"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time  `db:"updated_at" json:"updated_at"`
}

// NewItem holds validated values for creating an item.
type NewItem struct {
	Type        ItemType
	Title       string
	Description string
	Category    Category
	Location    string
	OccurredAt  time.Time
	ContactName string
	ContactInfo string
	ImageKey    *string
	Status      ItemStatus
}

// ItemChanges holds a validated partial update. Only fields with Set == true are written.
type ItemChanges struct {
	Type        Optional[ItemType]
	Title       Optional[string]
	Description Optional[string]
	Category    Optional[Category]
	Location    Optional[string]
	OccurredAt  Optional[time.Time]
	ContactName Optional[string]
	ContactInfo Optional[string]
	// ImageKey with Set == true and a nil Value removes the photo.
	ImageKey Optional[*string]
	// Status "open" also clears the resolution fields; "resolved" stamps resolved_at if unset.
	Status Optional[ItemStatus]
	// ResolvedBy and ResolutionNote are only set together with Status "resolved"; nil clears them.
	ResolvedBy     Optional[*string]
	ResolutionNote Optional[*string]
}

// IsEmpty reports whether no field is being changed.
func (c ItemChanges) IsEmpty() bool {
	return !c.Type.Set && !c.Title.Set && !c.Description.Set && !c.Category.Set && !c.Location.Set &&
		!c.OccurredAt.Set && !c.ContactName.Set && !c.ContactInfo.Set && !c.ImageKey.Set && !c.Status.Set &&
		!c.ResolvedBy.Set && !c.ResolutionNote.Set
}
