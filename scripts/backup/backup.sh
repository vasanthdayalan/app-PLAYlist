#!/usr/bin/env bash
# Dumps the database and copies server/.env into backups/<timestamp>.tar.gz
# containing playlist.dump and server.env.
# Requires the db container to be running (docker compose up -d db).
# Audio files are not included; back up ./audio separately.
set -euo pipefail

cd "$(dirname "$0")/../.."

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE="backups/.$STAMP"
ARCHIVE="backups/app-PLAYLIST-$STAMP.tar.gz"

mkdir -p "$STAGE"
chmod 700 backups "$STAGE"
trap 'rm -rf "$STAGE" "$ARCHIVE"' ERR

echo "Dumping database ..."
docker compose exec -T db pg_dump -U playlist -d playlist -Fc > "$STAGE/playlist.dump"

if [[ -f server/.env ]]; then
  cp server/.env "$STAGE/server.env"
  chmod 600 "$STAGE/server.env"
else
  echo "Warning: server/.env not found, skipped." >&2
fi

tar -czf "$ARCHIVE" -C "$STAGE" $(ls "$STAGE")
chmod 600 "$ARCHIVE"
rm -rf "$STAGE"

echo "Backup complete: $ARCHIVE"
