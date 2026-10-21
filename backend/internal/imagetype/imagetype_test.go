package imagetype_test

import (
	"testing"

	"lost-and-found/backend/internal/imagetype"
)

func TestDetect(t *testing.T) {
	tests := []struct {
		name     string
		head     []byte
		wantMime string
		wantExt  string
		wantOK   bool
	}{
		{"jpeg", []byte{0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 'J', 'F', 'I', 'F'}, "image/jpeg", "jpg", true},
		{"png", []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR"), "image/png", "png", true},
		{"gif", []byte("GIF89a\x01\x00\x01\x00"), "image/gif", "gif", true},
		{"webp", []byte("RIFF\x24\x00\x00\x00WEBPVP8 "), "image/webp", "webp", true},
		{"wav (RIFF but not WebP)", []byte("RIFF\x24\x00\x00\x00WAVEfmt "), "", "", false},
		{"html claiming to be an image", []byte("<html><script>alert(1)</script>"), "", "", false},
		{"svg (can carry scripts)", []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), "", "", false},
		{"empty", nil, "", "", false},
		{"truncated jpeg", []byte{0xff, 0xd8}, "", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mime, ext, ok := imagetype.Detect(tt.head)
			if ok != tt.wantOK {
				t.Fatalf("ok = %v (mime %q), want %v", ok, mime, tt.wantOK)
			}
			if ok && (mime != tt.wantMime || ext != tt.wantExt) {
				t.Errorf("got (%q, %q), want (%q, %q)", mime, ext, tt.wantMime, tt.wantExt)
			}
		})
	}
}

func TestNewKeyIsValid(t *testing.T) {
	for _, ext := range []string{"jpg", "png", "gif", "webp"} {
		if key := imagetype.NewKey(ext); !imagetype.ValidKey(key) {
			t.Errorf("NewKey(%q) = %q is not a valid key", ext, key)
		}
	}
}

func TestValidKeyRejects(t *testing.T) {
	for _, key := range []string{
		"../etc/passwd",
		"items/../secrets.png",
		"other/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.png",
		"items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.svg",
		"items/0b6c3d0e-8f3a-4c41-9b7e-1f2a3b4c5d6e.png/extra",
		"https://example.com/image.png",
		"",
	} {
		if imagetype.ValidKey(key) {
			t.Errorf("ValidKey(%q) = true, want false", key)
		}
	}
}
