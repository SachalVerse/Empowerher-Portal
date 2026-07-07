#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/empowerher"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "=== Backing up database ==="

docker compose exec -T db pg_dump -U ${DB_USER:-empowerher} ${DB_NAME:-empowerher} > "$BACKUP_DIR/db_$TIMESTAMP.sql"

echo "=== Backing up .env ==="
cp .env "$BACKUP_DIR/env_$TIMESTAMP"

echo "=== Backup complete: $BACKUP_DIR ==="
