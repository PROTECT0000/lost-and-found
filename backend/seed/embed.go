// Package seed embeds sample data for local development.
package seed

import "embed"

// SQL inserts sample items, or resets them to their original values, so running it twice is harmless.
//
//go:embed seed.sql
var SQL string

// Images holds the sample photos (see images/CREDITS.md).
//
//go:embed images/*.jpg
var Images embed.FS

// Image is a sample photo and the storage key the sample items in SQL point to.
type Image struct {
	File string
	Key  string
}

// Photos lists the photos to upload before running SQL.
var Photos = []Image{
	{File: "wallet.jpg", Key: "items/00000000-0000-4000-9000-000000000001.jpg"},
	{File: "keys.jpg", Key: "items/00000000-0000-4000-9000-000000000002.jpg"},
	{File: "earbuds.jpg", Key: "items/00000000-0000-4000-9000-000000000003.jpg"},
	{File: "backpack.jpg", Key: "items/00000000-0000-4000-9000-000000000004.jpg"},
	{File: "umbrella.jpg", Key: "items/00000000-0000-4000-9000-000000000005.jpg"},
	{File: "bottle.jpg", Key: "items/00000000-0000-4000-9000-000000000006.jpg"},
	{File: "laptop.jpg", Key: "items/00000000-0000-4000-9000-000000000007.jpg"},
	{File: "watch.jpg", Key: "items/00000000-0000-4000-9000-000000000008.jpg"},
	{File: "jacket.jpg", Key: "items/00000000-0000-4000-9000-000000000009.jpg"},
	{File: "calculator.jpg", Key: "items/00000000-0000-4000-9000-000000000010.jpg"},
	{File: "phone.jpg", Key: "items/00000000-0000-4000-9000-000000000011.jpg"},
	{File: "ring.jpg", Key: "items/00000000-0000-4000-9000-000000000012.jpg"},
	{File: "notebook.jpg", Key: "items/00000000-0000-4000-9000-000000000013.jpg"},
}
