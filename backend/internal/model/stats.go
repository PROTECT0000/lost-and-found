package model

// Stats summarizes items for the admin dashboard.
type Stats struct {
	Total      int             `db:"total" json:"total"`
	Open       int             `db:"open" json:"open"`
	Resolved   int             `db:"resolved" json:"resolved"`
	Lost       int             `db:"lost" json:"lost"`
	Found      int             `db:"found" json:"found"`
	ByCategory []CategoryCount `db:"-" json:"byCategory"`
}

// CategoryCount is the number of items in one category.
type CategoryCount struct {
	Category Category `db:"category" json:"category"`
	Count    int      `db:"count" json:"count"`
}
