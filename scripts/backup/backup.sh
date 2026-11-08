#!/usr/bin/env bash
# Dumps the database and copies server/.env into backups/<timestamp>/.
# Requires the db container to be running (docker compose up -d db).
# Audio files are not included; back up ./audio separately.
set -euo pipefail

cd "$(dirname "$0")/../.."

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="backups/$STAMP"

mkdir -p "$DEST"
chmod 700 backups "$DEST"
trap 'rm -rf "$DEST"' ERR

echo "Dumping database to $DEST/playlist.dump ..."
docker compose exec -T db pg_dump -U playlist -d playlist -Fc > "$DEST/playlist.dump"

if [[ -f server/.env ]]; then
  cp server/.env "$DEST/server.env"
  chmod 600 "$DEST/server.env"
  echo "Copied server/.env to $DEST/server.env"
else
  echo "Warning: server/.env not found, skipped." >&2
fi

echo "Backup complete: $DEST"
