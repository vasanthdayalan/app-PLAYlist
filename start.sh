#!/usr/bin/env bash
# Starts the database first, waits until it is healthy, then starts the app.
# Usage: ./start.sh            (start with existing images)
#        ./start.sh --build    (rebuild the app image first)
set -euo pipefail

cd "$(dirname "$0")"

BUILD_FLAG=""
if [[ "${1:-}" == "--build" ]]; then
  BUILD_FLAG="--build"
fi

echo "Starting database..."
docker compose up -d db

echo "Waiting for database to be healthy..."
for _ in $(seq 1 60); do
  status="$(docker inspect --format '{{.State.Health.Status}}' app-playlist-db-1 2>/dev/null || echo starting)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$status" != "healthy" ]]; then
  echo "Database did not become healthy (status: $status). Check: docker compose logs db" >&2
  exit 1
fi
echo "Database is ready."

echo "Starting app..."
docker compose up -d $BUILD_FLAG app

echo "Waiting for app on http://127.0.0.1:3000 ..."
for _ in $(seq 1 60); do
  if timeout 3 curl -s -o /dev/null "http://127.0.0.1:3000/api/tracks?page=1&pageSize=1"; then
    echo "App is up: http://127.0.0.1:3000"
    exit 0
  fi
  sleep 2
done

echo "App did not respond in time. Check: docker compose logs app" >&2
exit 1
