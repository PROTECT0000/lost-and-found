# Lost & Found

A web app for reporting and finding lost items.

- **backend/**: Go API with MySQL and S3-compatible image storage (MinIO locally)
- **frontend/**: React + Vite + MUI

## Quick start

You only need [Docker](https://docs.docker.com/get-docker/).

```bash
./up.sh
```

Then open **http://localhost:8080**.

To add 14 sample items with photos:

```bash
docker compose run --rm migrate seed
```

Stop everything with `docker compose down` (add `-v` to also delete the data).

### What's running

| Service | URL | Login |
| --- | --- | --- |
| App | http://localhost:8080 | Admin: `/admin/login`, password `change-me` |
| API docs | http://localhost:8787/api/docs | |
| phpMyAdmin | http://localhost:8081 | automatic |
| MinIO console | http://localhost:9001 | `devaccesskey` / `devsecretkey` |
| Grafana | http://localhost:3000 | `admin` / `admin` |
| Prometheus | http://localhost:9090 | |

To change passwords or ports, copy `.env.example` to `.env` and edit it.

## Develop without Docker for the app

Requires Go 1.26+ and Node.js. Docker still runs MySQL and MinIO.

```bash
docker compose up -d mysql minio

# Backend → http://localhost:8787
cd backend
cp .env.example .env
make migrate
make seed        # optional
make run

# Frontend → http://localhost:5173 (in another terminal)
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend && make test
cd frontend && npm test
```

## More

- API reference: [`backend/api/openapi.yaml`](backend/api/openapi.yaml), also at `/api/docs`
- Load test: `./loadtest.sh` with the stack running, then watch Grafana
- Production config: see [`backend/.env.example`](backend/.env.example)

## License

[MIT](LICENSE) © 2026 Akmal Fairuz
