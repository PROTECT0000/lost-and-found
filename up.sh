#!/usr/bin/env sh
# Start the full stack with Docker Compose. Extra arguments go to `docker compose up`.
#
#   ./up.sh            # docker compose up -d, with --build only if backend/ or frontend/
#                      # changed since its image was built (or the image is missing)
#   ./up.sh --build    # any arguments are passed through as-is
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

# Succeeds if image $2 is missing or any file in build context $1 is newer than it.
# Skips the same paths as the .dockerignore files.
needs_build() {
	created=$(docker image inspect "$2" --format '{{.Created}}' 2>/dev/null) || return 0
	created=$(echo "$created" | sed 's/\.[0-9]*Z$/Z/')
	[ -n "$(find "$1" \( -name node_modules -o -name dist -o -name bin -o -name '.env*' \) -prune \
		-o -type f -newermt "$created" -print | head -n 1)" ]
}

if [ "$#" -eq 0 ]; then
	tag=${IMAGE_TAG:-latest}
	if needs_build backend "ghcr.io/protect0000/lost-and-found-backend:$tag" ||
		needs_build frontend "ghcr.io/protect0000/lost-and-found-frontend:$tag"; then
		echo "Source changed since the last image build; rebuilding"
		set -- -d --build
	else
		set -- -d --no-build
	fi
fi
exec docker compose up "$@"
