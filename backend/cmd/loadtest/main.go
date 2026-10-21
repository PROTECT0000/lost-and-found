// Command loadtest seeds items through the public API and then drives mixed read/write traffic at
// the backend, so the Prometheus metrics and Grafana dashboard have something to show.
//
//	go run ./cmd/loadtest -base http://localhost:8787 -seed 200 -duration 60s -concurrency 20
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand/v2"
	"mime/multipart"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// tinyPNG is a valid 1x1 PNG used for image uploads.
var tinyPNG, _ = base64.StdEncoding.DecodeString(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

var (
	types      = []string{"lost", "found"}
	statuses   = []string{"open", "resolved"}
	categories = []string{"electronics", "wallet", "keys", "bag", "clothing", "documents", "jewelry", "other"}
	adjectives = []string{"Black", "Blue", "Red", "Silver", "Small", "Leather", "Old", "New", "Striped", "Green"}
	nouns      = map[string][]string{
		"electronics": {"phone", "earbuds", "laptop charger", "power bank", "smartwatch"},
		"wallet":      {"wallet", "card holder", "coin purse"},
		"keys":        {"house keys", "car key", "locker key"},
		"bag":         {"backpack", "tote bag", "laptop bag", "gym bag"},
		"clothing":    {"jacket", "scarf", "umbrella", "cap"},
		"documents":   {"passport", "student ID", "notebook", "folder"},
		"jewelry":     {"ring", "bracelet", "necklace", "watch"},
		"other":       {"water bottle", "book", "glasses", "toy"},
	}
	locations = []string{"Central Library", "Campus cafeteria", "Bus stop near Main Street", "Train station, platform 3",
		"Gym locker room", "Lecture hall B", "Parking lot", "City park", "Coffee shop", "Shopping mall food court"}
	names    = []string{"Rina", "Budi", "Sari", "Dimas", "Andi", "Putri", "Agus", "Maya", "Joko", "Lina"}
	searches = []string{"wallet", "key", "phone", "bag", "black", "library", "station", "blue", "zzz-no-match"}
)

type config struct {
	base        string
	password    string
	seed        int
	duration    time.Duration
	concurrency int
	images      float64
}

func main() {
	var cfg config
	flag.StringVar(&cfg.base, "base", "http://localhost:8787", "backend base URL (or the frontend, e.g. http://localhost:8080)")
	flag.StringVar(&cfg.password, "password", envOr("ADMIN_PASSWORD", "change-me"), "admin password (default $ADMIN_PASSWORD)")
	flag.IntVar(&cfg.seed, "seed", 200, "items to create before the load phase")
	flag.DurationVar(&cfg.duration, "duration", 60*time.Second, "length of the load phase (0 to only seed)")
	flag.IntVar(&cfg.concurrency, "concurrency", 20, "concurrent workers")
	flag.Float64Var(&cfg.images, "images", 0.2, "fraction of created items that upload a photo")
	flag.Parse()
	cfg.base = strings.TrimRight(cfg.base, "/")

	if err := run(cfg); err != nil {
		fmt.Fprintln(os.Stderr, "loadtest:", err)
		os.Exit(1)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// client wraps the HTTP client, the admin token and the IDs created so far.
type client struct {
	cfg   config
	http  *http.Client
	token string
	stats *stats

	mu  sync.Mutex
	ids []string
}

func run(cfg config) error {
	c := &client{cfg: cfg, http: &http.Client{Timeout: 15 * time.Second}, stats: newStats()}

	token, err := c.login()
	if err != nil {
		return fmt.Errorf("login: %w (is the stack running and -password correct?)", err)
	}
	c.token = token

	fmt.Printf("Seeding %d items via %s ...\n", cfg.seed, cfg.base)
	start := time.Now()
	c.parallel(cfg.seed, func() { c.createItem(true) })
	c.collectExistingIDs()
	fmt.Printf("Seeded in %s; %d item IDs known.\n", time.Since(start).Round(time.Millisecond), len(c.ids))
	c.stats.print("Seed phase", time.Since(start))

	if cfg.duration <= 0 {
		return nil
	}
	c.stats = newStats()
	fmt.Printf("\nRunning load for %s with %d workers ...\n", cfg.duration, cfg.concurrency)
	start = time.Now()
	deadline := start.Add(cfg.duration)
	var wg sync.WaitGroup
	for range cfg.concurrency {
		wg.Go(func() {
			for time.Now().Before(deadline) {
				c.randomAction()
			}
		})
	}
	wg.Wait()
	c.stats.print("Load phase", time.Since(start))
	return nil
}

// parallel runs fn n times spread over the configured number of workers.
func (c *client) parallel(n int, fn func()) {
	jobs := make(chan struct{})
	var wg sync.WaitGroup
	for range c.cfg.concurrency {
		wg.Go(func() {
			for range jobs {
				fn()
			}
		})
	}
	for range n {
		jobs <- struct{}{}
	}
	close(jobs)
	wg.Wait()
}

// action is one weighted kind of request in the load mix.
type action struct {
	weight int
	fn     func(*client)
}

var actions = []action{
	{55, (*client).listItems},
	{20, (*client).getItem},
	{8, func(c *client) { c.createItem(false) }},
	{7, (*client).toggleStatus},
	{4, (*client).adminStats},
	{3, (*client).getMissing},
	{2, (*client).createInvalid},
	{1, (*client).deleteItem},
}

func (c *client) randomAction() {
	total := 0
	for _, a := range actions {
		total += a.weight
	}
	n := rand.IntN(total)
	for _, a := range actions {
		if n < a.weight {
			a.fn(c)
			return
		}
		n -= a.weight
	}
}

func (c *client) login() (string, error) {
	var out struct {
		Token string `json:"token"`
	}
	body, _ := json.Marshal(map[string]string{"password": c.cfg.password})
	if err := c.do("login", "POST", "/api/auth/login", "application/json", bytes.NewReader(body), false, http.StatusOK, &out); err != nil {
		return "", err
	}
	return out.Token, nil
}

func (c *client) listItems() {
	q := []string{fmt.Sprintf("page=%d", 1+rand.IntN(5)), fmt.Sprintf("limit=%d", []int{12, 24, 48}[rand.IntN(3)])}
	if rand.IntN(2) == 0 {
		q = append(q, "type="+pick(types))
	}
	if rand.IntN(3) == 0 {
		q = append(q, "status="+pick(statuses))
	}
	if rand.IntN(4) == 0 {
		q = append(q, "category="+pick(categories))
	}
	if rand.IntN(4) == 0 {
		q = append(q, "q="+pick(searches))
	}
	_ = c.do("list items", "GET", "/api/items?"+strings.Join(q, "&"), "", nil, false, http.StatusOK, nil)
}

func (c *client) getItem() {
	if id, ok := c.randomID(); ok {
		// 404 is expected when another worker deleted the item in the meantime.
		_ = c.do("get item", "GET", "/api/items/"+id, "", nil, false, http.StatusOK, nil, http.StatusNotFound)
	}
}

func (c *client) getMissing() {
	_ = c.do("get missing item", "GET", "/api/items/"+fakeUUID(), "", nil, false, http.StatusNotFound, nil)
}

func (c *client) createItem(seeding bool) {
	category := pick(categories)
	item := map[string]any{
		"type":         pick(types),
		"title":        pick(adjectives) + " " + pick(nouns[category]),
		"description":  "Reported by the load test.",
		"category":     category,
		"location":     pick(locations),
		"occurred_at":  time.Now().Add(-time.Duration(rand.IntN(60*24)) * time.Hour).UTC().Format(time.RFC3339),
		"contact_name": pick(names),
		"contact_info": strings.ToLower(pick(names)) + "@example.com",
	}
	if rand.Float64() < c.cfg.images {
		if key, err := c.upload(); err == nil {
			item["image_key"] = key
		}
	}
	name := "create item"
	if seeding {
		name = "seed item"
	}
	var out struct {
		ID string `json:"id"`
	}
	body, _ := json.Marshal(item)
	if err := c.do(name, "POST", "/api/items", "application/json", bytes.NewReader(body), false, http.StatusCreated, &out); err != nil {
		return
	}
	c.mu.Lock()
	c.ids = append(c.ids, out.ID)
	c.mu.Unlock()

	// Resolve roughly a third of the seeded items so the status breakdown is realistic.
	if seeding && rand.IntN(3) == 0 {
		c.patchStatus(out.ID, "resolved")
	}
}

func (c *client) createInvalid() {
	body := `{"type":"stolen","title":"","category":"cars"}`
	_ = c.do("create invalid item", "POST", "/api/items", "application/json", strings.NewReader(body), false, http.StatusBadRequest, nil)
}

func (c *client) upload() (string, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", "photo.png")
	if err != nil {
		return "", err
	}
	_, _ = part.Write(tinyPNG)
	_ = w.Close()
	var out struct {
		Key string `json:"key"`
	}
	if err := c.do("upload image", "POST", "/api/uploads", w.FormDataContentType(), &buf, false, http.StatusCreated, &out); err != nil {
		return "", err
	}
	return out.Key, nil
}

func (c *client) toggleStatus() {
	if id, ok := c.randomID(); ok {
		c.patchStatus(id, pick(statuses))
	}
}

func (c *client) patchStatus(id, status string) {
	body := map[string]string{"status": status}
	if status == "resolved" {
		body["resolved_by"] = pick(names)
		body["resolution_note"] = "Collected at the front desk."
	}
	data, _ := json.Marshal(body)
	_ = c.do("update status", "PATCH", "/api/items/"+id, "application/json", bytes.NewReader(data), true, http.StatusOK, nil, http.StatusNotFound)
}

func (c *client) adminStats() {
	_ = c.do("admin stats", "GET", "/api/admin/stats", "", nil, true, http.StatusOK, nil)
}

// deleteItem removes an item created by this run; seeded data from elsewhere is left alone.
func (c *client) deleteItem() {
	c.mu.Lock()
	if len(c.ids) < 50 {
		c.mu.Unlock()
		return
	}
	i := rand.IntN(len(c.ids))
	id := c.ids[i]
	c.ids[i] = c.ids[len(c.ids)-1]
	c.ids = c.ids[:len(c.ids)-1]
	c.mu.Unlock()
	_ = c.do("delete item", "DELETE", "/api/items/"+id, "", nil, true, http.StatusNoContent, nil, http.StatusNotFound)
}

// collectExistingIDs adds items that were already in the database, so reads also hit them.
func (c *client) collectExistingIDs() {
	var out struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := c.do("list items", "GET", "/api/items?limit=100", "", nil, false, http.StatusOK, &out); err != nil {
		return
	}
	known := map[string]bool{}
	for _, id := range c.ids {
		known[id] = true
	}
	for _, it := range out.Data {
		if !known[it.ID] {
			c.ids = append(c.ids, it.ID)
		}
	}
}

func (c *client) randomID() (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.ids) == 0 {
		return "", false
	}
	return c.ids[rand.IntN(len(c.ids))], true
}

// do sends one request and records it under name. Any status in want/alsoOK counts as success;
// out, when non-nil, receives the decoded JSON body.
func (c *client) do(name, method, path, contentType string, body io.Reader, admin bool, want int, out any, alsoOK ...int) error {
	req, err := http.NewRequest(method, c.cfg.base+path, body)
	if err != nil {
		return err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if admin {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	start := time.Now()
	resp, err := c.http.Do(req)
	elapsed := time.Since(start)
	if err != nil {
		c.stats.record(name, elapsed, false)
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)

	ok := resp.StatusCode == want
	for _, s := range alsoOK {
		ok = ok || resp.StatusCode == s
	}
	c.stats.record(name, elapsed, ok)
	if !ok {
		return fmt.Errorf("%s %s: status %d: %s", method, path, resp.StatusCode, strings.TrimSpace(string(data)))
	}
	if out != nil && resp.StatusCode == want {
		if err := json.Unmarshal(data, out); err != nil {
			return fmt.Errorf("%s %s: decode: %w", method, path, err)
		}
	}
	return nil
}

func pick[T any](s []T) T { return s[rand.IntN(len(s))] }

func fakeUUID() string {
	return fmt.Sprintf("%08x-%04x-4%03x-8%03x-%012x",
		rand.Uint32(), rand.IntN(1<<16), rand.IntN(1<<12), rand.IntN(1<<12), rand.Uint64()&(1<<48-1))
}

// stats collects latencies per request name.
type stats struct {
	mu   sync.Mutex
	runs map[string]*series
}

type series struct {
	latencies []time.Duration
	errors    int
}

func newStats() *stats { return &stats{runs: map[string]*series{}} }

func (s *stats) record(name string, d time.Duration, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.runs[name]
	if r == nil {
		r = &series{}
		s.runs[name] = r
	}
	r.latencies = append(r.latencies, d)
	if !ok {
		r.errors++
	}
}

func (s *stats) print(title string, elapsed time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	names := make([]string, 0, len(s.runs))
	total := 0
	for name, r := range s.runs {
		names = append(names, name)
		total += len(r.latencies)
	}
	sort.Strings(names)

	fmt.Printf("\n%s: %d requests in %s (%.1f req/s)\n", title, total, elapsed.Round(time.Millisecond), float64(total)/elapsed.Seconds())
	fmt.Printf("%-20s %8s %7s %9s %9s %9s\n", "request", "count", "errors", "p50", "p95", "p99")
	for _, name := range names {
		r := s.runs[name]
		sort.Slice(r.latencies, func(i, j int) bool { return r.latencies[i] < r.latencies[j] })
		fmt.Printf("%-20s %8d %7d %9s %9s %9s\n", name, len(r.latencies), r.errors,
			pct(r.latencies, 0.50), pct(r.latencies, 0.95), pct(r.latencies, 0.99))
	}
}

func pct(sorted []time.Duration, p float64) time.Duration {
	if len(sorted) == 0 {
		return 0
	}
	return sorted[int(p*float64(len(sorted)-1))].Round(100 * time.Microsecond)
}
