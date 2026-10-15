#!/bin/sh
# Restores a dump into a throwaway PostgreSQL container and checks it is usable. Run at least monthly.
# Usage: scripts/restore-check.sh backups/db-YYYYMMDDTHHMMSSZ.dump
set -eu
dump=${1:?Pass the path to a db-*.dump file}
name=batra-restore-check-$$
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=restore-check -e POSTGRES_DB=restore postgres:17-alpine >/dev/null
trap 'docker stop "$name" >/dev/null' EXIT
until docker exec "$name" pg_isready -U postgres -d restore >/dev/null 2>&1; do sleep 1; done
docker cp "$dump" "$name:/tmp/restore.dump"
docker exec "$name" pg_restore --no-owner --exit-on-error -U postgres -d restore /tmp/restore.dump
docker exec "$name" psql -U postgres -d restore -v ON_ERROR_STOP=1 -tAc "SELECT 'migrations=' || COUNT(*) FROM schema_migrations; SELECT 'users=' || COUNT(*) FROM users; SELECT 'complaints=' || COUNT(*) FROM complaints; SELECT 'media=' || COUNT(*) FROM media;"
echo "Restore check passed for $dump"
