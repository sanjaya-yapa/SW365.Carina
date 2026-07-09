#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/personal-finance-backup.env"
BACKUP_BLOB_NAME="${1:-latest}"
APP_SERVICE_NAME="${2:-personal-finance}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Backup environment file not found at $ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

RESTORE_DIR="/var/backups/personal-finance/restore"
mkdir -p "$RESTORE_DIR"

az login --identity >/dev/null

if [ "$BACKUP_BLOB_NAME" = "latest" ]; then
  BACKUP_BLOB_NAME="$(
    az storage blob list \
      --account-name "$STORAGE_ACCOUNT_NAME" \
      --container-name "$STORAGE_CONTAINER_NAME" \
      --prefix "${DB_NAME}_" \
      --auth-mode login \
      --query "[].name" \
      --output tsv | sort | tail -n 1
  )"
fi

if [ -z "$BACKUP_BLOB_NAME" ]; then
  echo "No backup blob was found for database $DB_NAME"
  exit 1
fi

RESTORE_FILE="$RESTORE_DIR/$BACKUP_BLOB_NAME"

echo "Downloading backup blob: $BACKUP_BLOB_NAME"
az storage blob download \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$STORAGE_CONTAINER_NAME" \
  --name "$BACKUP_BLOB_NAME" \
  --file "$RESTORE_FILE" \
  --auth-mode login \
  --overwrite true

echo "Stopping application service: $APP_SERVICE_NAME"
systemctl stop "$APP_SERVICE_NAME"

echo "Restoring database: $DB_NAME"
gunzip -c "$RESTORE_FILE" | mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

echo "Starting application service: $APP_SERVICE_NAME"
systemctl start "$APP_SERVICE_NAME"
systemctl is-active "$APP_SERVICE_NAME"

echo "Database restore completed from: $BACKUP_BLOB_NAME"
