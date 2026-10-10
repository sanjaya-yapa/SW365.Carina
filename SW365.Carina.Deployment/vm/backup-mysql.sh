#!/usr/bin/env bash
set -euo pipefail
umask 077

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
PARTIAL_FILE="$(mktemp "${BACKUP_FILE}.partial.XXXXXX")"
trap 'rm -f -- "$PARTIAL_FILE"' EXIT

# This script runs under sudo (or root cron), matching setup-app.sh and migrations.
# Root socket authentication can read routines created by either root or carina_app.
mysqldump \
  --protocol=socket \
  --user=root \
  --no-tablespaces \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip > "$PARTIAL_FILE"

gzip -t "$PARTIAL_FILE"
mv -- "$PARTIAL_FILE" "$BACKUP_FILE"

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
