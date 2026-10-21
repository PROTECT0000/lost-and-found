# Lost & Found

Full-stack CRUD app for reporting lost and found items.

- **backend/** — Go, [chi](https://github.com/go-chi/chi), MySQL via [sqlx](https://github.com/jmoiron/sqlx), S3-compatible image storage via [minio-go](https://github.com/minio/minio-go), `slog` logging, Prometheus metrics
- **frontend/** — React + Vite, MUI, Zustand, Axios, React Router, react-icons (Material)

## Local development

Requires Go 1.26+ (fetched automatically by `go` when `GOTOOLCHAIN=auto`), a MySQL 8 database,
and Docker for local S3-compatible storage ([SeaweedFS](https://github.com/seaweedfs/seaweedfs)).

```bash
# Storage (S3 API on http://localhost:8333, bucket "lost-and-found" is created automatically)
docker compose up -d

# Backend (http://localhost:8787, metrics on :9091)
cd backend
cp .env.example .env       # set DATABASE_DSN, ADMIN_PASSWORD, JWT_SECRET
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

## API

🔒 = requires `Authorization: Bearer <token>` from `/api/auth/login`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness: the process is up |
| GET | `/api/health/ready` | Readiness: MySQL and storage reachable (503 otherwise) |
| GET | `/api/items` | List items. Query: `type` (lost/found), `status` (open/resolved), `category`, `q`, `page`, `limit` |
| GET | `/api/items/:id` | Get one item |
| POST | `/api/items` | Create item |
| PATCH | `/api/items/:id` | 🔒 Partially update item |
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
- **Health:** `/api/health` (liveness) and `/api/health/ready` (readiness; details only in logs).

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
