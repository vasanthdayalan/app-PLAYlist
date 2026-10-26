#!/usr/bin/env bash
# Stops the app and the database. Data is kept in the db-data volume.
set -euo pipefail

cd "$(dirname "$0")"

echo "Stopping app and database..."
docker compose stop app db
echo "Stopped. Data is kept. Start again with ./start.sh"
