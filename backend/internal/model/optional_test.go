package model_test

import (
	"encoding/json"
	"testing"

	"lost-and-found/backend/internal/model"
)

type patch struct {
	Title    model.Optional[string]  `json:"title"`
	ImageKey model.Optional[*string] `json:"image_key"`
}

func TestOptionalDistinguishesAbsentNullAndValue(t *testing.T) {
	tests := []struct {
		name         string
		body         string
		wantTitleSet bool
		wantImageSet bool
		wantImageNil bool
	}{
		{"absent", `{}`, false, false, true},
		{"explicit null", `{"image_key": null}`, false, true, true},
		{"value", `{"title": "x", "image_key": "items/a.png"}`, true, true, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var p patch
			if err := json.Unmarshal([]byte(tt.body), &p); err != nil {
				t.Fatal(err)
			}
			if p.Title.Set != tt.wantTitleSet {
				t.Errorf("Title.Set = %v, want %v", p.Title.Set, tt.wantTitleSet)
			}
			if p.ImageKey.Set != tt.wantImageSet {
				t.Errorf("ImageKey.Set = %v, want %v", p.ImageKey.Set, tt.wantImageSet)
			}
			if (p.ImageKey.Value == nil) != tt.wantImageNil {
				t.Errorf("ImageKey.Value nil = %v, want %v", p.ImageKey.Value == nil, tt.wantImageNil)
			}
		})
	}
}

func TestOptionalRejectsWrongType(t *testing.T) {
	var p patch
	if err := json.Unmarshal([]byte(`{"title": 42}`), &p); err == nil {
		t.Fatal("expected an error for a number in a string field")
	}
}
