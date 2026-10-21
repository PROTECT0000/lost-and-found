.PHONY: run build migrate migrate-down migrate-status seed loadtest test test-db vet

run:            ## Run the API (reads .env)
	go run ./cmd/api

build:          ## Build binaries into ./bin
	go build -o bin/api ./cmd/api
	go build -o bin/migrate ./cmd/migrate

migrate:        ## Apply all migrations
	go run ./cmd/migrate up

migrate-down:   ## Roll back the last migration
	go run ./cmd/migrate down

migrate-status: ## Show migration status
	go run ./cmd/migrate status

seed:           ## Insert sample items (idempotent)
	go run ./cmd/migrate seed

loadtest:       ## Seed items and drive traffic at a running API; pass flags via ARGS="-duration 2m"
	go run ./cmd/loadtest $(ARGS)

test:           ## Unit tests (MySQL tests are skipped without TEST_DATABASE_DSN)
	go test ./...

test-db:        ## Include MySQL repository tests; TEST_DATABASE_DSN must point to a *_test database
	go test -count=1 ./internal/repository/...

vet:
	go vet ./...
