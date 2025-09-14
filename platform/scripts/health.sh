#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker-compose -f docker-compose-minimal.yml"

echo "🏥 Checking service health..."
echo "Infrastructure Services:"
$COMPOSE ps || true

echo
echo "HTTP checks:"
if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
  echo "  API /health: OK"
else
  echo "  API /health: FAIL"
fi

if curl -fsS http://localhost:7700/health >/dev/null 2>&1; then
  echo "  MeiliSearch: OK"
else
  echo "  MeiliSearch: FAIL"
fi

if curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; then
  echo "  MinIO: OK"
else
  echo "  MinIO: FAIL"
fi

echo
echo "Database checks:"
docker exec -t ventalocal-db pg_isready -U ventalocal >/dev/null 2>&1 && echo "  Postgres: OK" || echo "  Postgres: FAIL"
docker exec -t ventalocal-redis redis-cli ping >/dev/null 2>&1 && echo "  Redis: OK" || echo "  Redis: FAIL"

echo
echo "Tip: for /api/products usa header: x-tenant-id: demo"

