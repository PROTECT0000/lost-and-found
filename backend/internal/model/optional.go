package model

import "encoding/json"

// Optional wraps a value and records whether it was provided. In JSON it distinguishes an absent
// field (Set == false) from an explicit value or null (Set == true), which PATCH requests need.
type Optional[T any] struct {
	Value T
	Set   bool
}

// Some returns an Optional that is set to v.
func Some[T any](v T) Optional[T] { return Optional[T]{Value: v, Set: true} }

// UnmarshalJSON marks the field as set and decodes the value. It is only called when the field is
// present in the JSON object (including when it is null).
func (o *Optional[T]) UnmarshalJSON(data []byte) error {
	o.Set = true
	return json.Unmarshal(data, &o.Value)
}
