package model

import "time"

// ItemFilter selects and paginates items for listing.
type ItemFilter struct {
	// Type, Status and Category are optional exact-match filters (nil means any).
	Type     *ItemType
	Status   *ItemStatus
	Category *Category
	// Query is a free-text search over title, description and location ("" means no search).
	Query string
	// ReportedFrom and ReportedTo limit created_at to [from, to); nil means unbounded.
	ReportedFrom *time.Time
	ReportedTo   *time.Time
	// Sort is the column to order by ("" means SortCreatedAt). Order is descending unless Asc.
	Sort SortField
	Asc  bool
	// Page is 1-based.
	Page  int
	Limit int
}

// SortField is a column items can be ordered by. Values double as SQL column names, so only
// the constants below may ever be used.
type SortField string

// Sortable columns.
const (
	SortCreatedAt  SortField = "created_at"
	SortOccurredAt SortField = "occurred_at"
	SortTitle      SortField = "title"
	SortType       SortField = "type"
	SortCategory   SortField = "category"
	SortLocation   SortField = "location"
	SortStatus     SortField = "status"
)

var sortFields = []SortField{SortCreatedAt, SortOccurredAt, SortTitle, SortType, SortCategory, SortLocation, SortStatus}

// Valid reports whether s is a known sort column.
func (s SortField) Valid() bool {
	for _, v := range sortFields {
		if s == v {
			return true
		}
	}
	return false
}

// Offset returns the number of rows to skip for the current page.
func (f ItemFilter) Offset() int { return (f.Page - 1) * f.Limit }

// Pagination describes the page returned by a list query.
type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	// Total counts all items matching the filter, across every page.
	Total int `json:"total"`
}
