#!/bin/sh
# Seed items through the API and drive mixed traffic at it, to populate the Prometheus/Grafana metrics.
# Start the stack first (./up.sh). Flags are passed through, e.g. ./loadtest.sh -seed 500 -duration 2m
# Run ./loadtest.sh -h for all options.
set -eu

cd "$(dirname "$0")/backend"
exec go run ./cmd/loadtest "$@"
