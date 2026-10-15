#!/bin/sh
# Nightly PostgreSQL dump plus the filesystem media volume (skip media when S3 versioning is used).
# Copy /backups off this host (e.g. rclone/restic to separate storage); a backup on the same disk is not a backup.
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump --format=custom --no-owner --file="/backups/db-$stamp.dump"
if [ -d /media ] && [ "$(ls -A /media 2>/dev/null)" ]; then tar -C /media -czf "/backups/media-$stamp.tar.gz" .; fi
find /backups -name 'db-*.dump' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
find /backups -name 'media-*.tar.gz' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "backup complete: $stamp"
