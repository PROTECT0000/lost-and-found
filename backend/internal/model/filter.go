package model

// ItemFilter selects and paginates items for listing.
type ItemFilter struct {
	// Type, Status and Category are optional exact-match filters (nil means any).
	Type     *ItemType
	Status   *ItemStatus
	Category *Category
	// Query is a free-text search over title, description and location ("" means no search).
	Query string
	// Page is 1-based.
	Page  int
	Limit int
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
