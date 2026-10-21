# Lost & Found

Full-stack CRUD app for reporting lost and found items.

- **backend/** — Go, [chi](https://github.com/go-chi/chi), MySQL via [sqlx](https://github.com/jmoiron/sqlx), S3-compatible image storage via [minio-go](https://github.com/minio/minio-go), `slog` logging, Prometheus metrics
- **frontend/** — React + Vite, MUI, Zustand, Axios, React Router, react-icons (Material)

## Local development

## Run everything with Docker

```bash
cp .env.example .env       # optional: override the local defaults
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| App (nginx, proxies `/api` to the backend) | http://localhost:8080 |
| API | http://localhost:8787 |
| MinIO console (S3 API on `:9000`) | http://localhost:9001 (`devaccesskey` / `devsecretkey`) |
| Prometheus | http://localhost:9090 |
| Grafana, "Lost & Found" dashboard | http://localhost:3000 (`admin` / `admin`) |

MySQL (`localhost:3306`, `lostfound` / `lostfound`) is migrated automatically by the one-shot `migrate`
service, and MinIO creates the `lost-and-found` bucket on startup. Load sample items with
`docker compose run --rm migrate seed`. MinIO no longer publishes official images, so this uses
Bitnami's last free build (`bitnamilegacy/minio`), which no longer receives updates.

## Local development

Requires Go 1.26+ (fetched automatically by `go` when `GOTOOLCHAIN=auto`) and Docker for MySQL and
[MinIO](https://github.com/minio/minio).

```bash
# MySQL (localhost:3306) and MinIO (S3 API on http://localhost:9000, bucket "lost-and-found" created automatically)
docker compose up -d mysql minio

# Backend (http://localhost:8787, metrics on :9091)
cd backend
cp .env.example .env       # defaults match docker compose; set ADMIN_PASSWORD, JWT_SECRET
make migrate               # apply migrations (goose)
make seed                  # optional sample items
make run

# Frontend (http://localhost:5173), in another terminal
cd frontend
npm install
npm run dev                # /api is proxied to localhost:8787
```

## Tests

```bash
cd backend && make test   # go test; in-memory fakes for the store and S3
cd frontend && npm test   # Vitest; pure logic (validation, date/time merging, stores, device detection)

# MySQL repository tests (they TRUNCATE items, so the database name must end in _test):
cd backend && TEST_DATABASE_DSN='user:pass@tcp(host:3306)/lost_and_found_test' make test-db
```

Tests focus on fragile logic: partial updates, datetime/UTC handling, dynamic SQL filters, image
type sniffing and key validation, image cleanup, admin auth, and form step navigation.

## Admin

Visitors can browse and report items. Editing, resolving and deleting are admin-only.

- Log in at `/admin/login` with `ADMIN_PASSWORD` (sessions last 8 hours).
- `/admin` shows stats (totals, open/resolved, lost/found, by category) and a table of all items with quick actions.
- **Export** on `/admin` downloads every item matching the current filters (all pages) as Excel (`.xlsx`) or PDF.
  Files are built in the browser (`write-excel-file`, `jsPDF`); images are not included.

Lists are paginated (12, 24 or 48 per page). Filters, page and page size are kept in the URL
(e.g. `/?type=lost&page=2&limit=24`), so refresh, back/forward and shared links keep their place,
and the home page and admin dashboard each keep their own.

## API

🔒 = requires `Authorization: Bearer <token>` from `/api/auth/login`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness: the process is up |
| GET | `/api/health/ready` | Readiness: MySQL and storage reachable (503 otherwise) |
| GET | `/api/items` | List items. Query: `type` (lost/found), `status` (open/resolved), `category`, `q`, `page`, `limit` |
| GET | `/api/items/:id` | Get one item |
| POST | `/api/items` | Create item |
| PATCH | `/api/items/:id` | 🔒 Partially update item; `resolved_by`/`resolution_note` are accepted with `status: "resolved"`, and reopening clears them |
| DELETE | `/api/items/:id` | 🔒 Delete item |
| POST | `/api/auth/login` | `{ "password": "..." }` → `{ token, expiresAt }` |
| GET | `/api/auth/me` | 🔒 Check the token |
| GET | `/api/admin/stats` | 🔒 Dashboard stats |
| POST | `/api/uploads` | Upload an image (`multipart/form-data`, field `file`, max 5 MB, JPEG/PNG/WebP/GIF) → `{ key, url }` |
| GET | `/api/uploads/items/:file` | Serve an uploaded image (used when the bucket is private) |

Items store the uploaded image's `image_key`; responses also include a ready-to-use `image_url`.
`occurred_at` is an RFC 3339 datetime with timezone (e.g. `2026-10-21T09:30:00+07:00`) and is stored in UTC;
timestamps in responses are UTC (`...Z`). Errors are `{ "error": "..." }`, plus `issues` for validation errors.

Example:

```bash
curl -X POST localhost:8787/api/items -H 'content-type: application/json' -d '{
  "type": "found", "title": "Umbrella", "category": "other", "location": "Lobby",
  "occurred_at": "2026-10-21T09:30:00Z", "contact_name": "Ana", "contact_info": "ana@example.com"
}'
```

Categories: `electronics`, `wallet`, `keys`, `bag`, `clothing`, `documents`, `jewelry`, `other`.

## Observability

- **Logs:** `log/slog`, one line per request with `request_id`, method, route pattern, status, bytes, duration,
  client IP and user agent; 5xx at error level, panics with stack traces. `LOG_FORMAT=json` for log collectors,
  `LOG_LEVEL=debug|info|warn|error`.
- **Request IDs:** every response has `X-Request-ID` (an incoming one from a proxy is reused when safe);
  all log lines for a request carry it.
- **Metrics:** Prometheus on `METRICS_ADDR` (default `:9091/metrics`, separate from the public port):
  `http_requests_total`, `http_request_duration_seconds`, `http_requests_in_flight`,
  `lostfound_image_uploads_total{result}`, `lostfound_image_cleanups_total{result}`, MySQL pool stats
  (`go_sql_*`), Go runtime and process metrics.
- **Dashboard:** `docker compose up` runs Prometheus (scraping `backend:9091`, config in
  `monitoring/prometheus/prometheus.yml`) and Grafana with a provisioned "Lost & Found" dashboard
  (`monitoring/grafana/dashboards/lost-and-found.json`): up/down, request rate, 5xx rate, latency
  percentiles per route, status classes, image uploads and cleanups, MySQL pool usage and waits, and Go runtime.
- **Health:** `/api/health` (liveness) and `/api/health/ready` (readiness; details only in logs).
- **Load test:** with the stack running, `./loadtest.sh` (or `make loadtest` in `backend/`) logs in as admin,
  seeds items through the API (some with photos, about a third resolved), then runs a weighted mix of
  list/search, detail, create, resolve/reopen, admin stats, 404 and 400 requests and prints p50/p95/p99 per request.
  Open Grafana at http://localhost:3000 to watch the dashboard fill in. Flags: `-base` (default
  `http://localhost:8787`), `-password` (default `$ADMIN_PASSWORD` or `change-me`), `-seed 200`,
  `-duration 60s` (`0` only seeds), `-concurrency 20`, `-images 0.2`.
  Example: `./loadtest.sh -seed 500 -duration 2m -concurrency 50`.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `master` and `v*` tags:

- **Backend:** `gofmt`, `go vet`, and `go test -race` including the MySQL repository tests (against a MySQL 8.4 service container).
- **Frontend:** `npm ci`, lint, tests and production build.
- **Config:** `docker compose config`, `promtool check config`, and the Grafana dashboard JSON.
- **Images:** builds `linux/amd64` and `linux/arm64` images of the backend and frontend once all checks pass. Pull requests only build them.
  Pushes to `master` publish `latest` and `sha-<commit>`, and `v1.2.3` tags publish `1.2.3` and `1.2`, to
  `ghcr.io/protect0000/lost-and-found-backend` and `-frontend`.

To run the published images instead of building locally (set `IMAGE_TAG` to pin a version):

```bash
docker compose pull && docker compose up -d --no-build
```

New GHCR packages are private by default. Make them public in the package settings on GitHub, or
`docker login ghcr.io` on the server first.

## Deploy

```bash
cd backend
make build                 # bin/api and bin/migrate
./bin/migrate up           # run with the production environment variables set
./bin/api
```

Configuration is read from environment variables (`.env` is optional). See `backend/.env.example`.
`DATABASE_DSN` is a standard go-sql-driver DSN; `parseTime`, `loc=UTC`, `time_zone` and `clientFoundRows`
are added automatically. Storage settings:

- `S3_ENDPOINT` — URL, scheme decides TLS. e.g. R2: `https://<account_id>.r2.cloudflarestorage.com`, AWS: `https://s3.<region>.amazonaws.com`
- `S3_REGION` — `auto` for R2, the bucket's region for AWS
- `S3_BUCKET` — bucket name
- `S3_PUBLIC_URL` — optional public/CDN base URL for the bucket. If empty, images are streamed through the API at `/api/uploads/...`.

Set `CORS_ORIGINS` to your frontend's URL in production.

Frontend (e.g. Cloudflare Pages): build with `VITE_API_URL=https://<your-api-host> npm run build` and deploy `frontend/dist`. `public/_redirects` provides the SPA fallback so deep links work.
