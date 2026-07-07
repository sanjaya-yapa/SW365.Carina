#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/personal-finance-backup.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Backup environment file not found at $ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

BACKUP_DIR="/var/backups/personal-finance/mysql"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
BLOB_NAME="$(basename "$BACKUP_FILE")"

mkdir -p "$BACKUP_DIR"

mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  -u "$DB_USER" \
  -p"$DB_PASSWORD" \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

az login --identity >/dev/null

az storage blob upload \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$STORAGE_CONTAINER_NAME" \
  --name "$BLOB_NAME" \
  --file "$BACKUP_FILE" \
  --auth-mode login \
  --overwrite false

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +14 -delete

echo "Backup uploaded: $BLOB_NAME"

