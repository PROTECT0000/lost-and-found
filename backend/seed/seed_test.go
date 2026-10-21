package seed_test

import (
	"path"
	"strings"
	"testing"

	"lost-and-found/backend/internal/imagetype"
	"lost-and-found/backend/seed"
)

func TestPhotosMatchSQL(t *testing.T) {
	for _, p := range seed.Photos {
		data, err := seed.Images.ReadFile(path.Join("images", p.File))
		if err != nil {
			t.Fatal(err)
		}
		if _, ext, ok := imagetype.Detect(data); !ok || ext != "jpg" {
			t.Errorf("%s: not a JPEG", p.File)
		}
		if !imagetype.ValidKey(p.Key) {
			t.Errorf("%s: invalid key %q", p.File, p.Key)
		}
		if !strings.Contains(seed.SQL, "'"+p.Key+"'") {
			t.Errorf("%s: key %q not used in seed.sql", p.File, p.Key)
		}
	}
}
