#!/usr/bin/env sh
# Start the full stack with Docker Compose. Extra arguments go to `docker compose up`.
#
#   ./up.sh            # same as: docker compose up -d --build
#   ./up.sh --no-build
#
# Some VMs (e.g. GitHub Codespaces) have stale iptables-legacy rules alongside Docker's
# nftables rules, with the legacy FORWARD policy set to DROP. Traffic between containers
# then gets dropped and services fail with "dial tcp ...: i/o timeout". Docker's own
# rules still isolate networks, so the legacy policy is safe to open up.
set -eu

cd "$(dirname "$0")"

if command -v iptables-legacy >/dev/null 2>&1 &&
	sudo -n iptables-legacy -S FORWARD 2>/dev/null | grep -qx -- '-P FORWARD DROP'; then
	echo "Fixing stale iptables-legacy FORWARD DROP policy (blocks container-to-container traffic)"
	sudo iptables-legacy -P FORWARD ACCEPT
fi

if [ "$#" -eq 0 ]; then
	set -- -d --build
fi
exec docker compose up "$@"
