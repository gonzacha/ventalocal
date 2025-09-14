#!/bin/bash
# PostgreSQL Backup Script for ComercioYA Platform
# Runs daily at 2:00 AM via cron

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ventalocal_${DATE}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup..."

# Create compressed backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h postgres \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --no-privileges \
    --no-owner | gzip > "$BACKUP_FILE"

# Verify backup was created and has content
if [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] Backup created successfully: $BACKUP_FILE"
    echo "[$(date)] Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "[$(date)] ERROR: Backup file is empty or was not created!"
    exit 1
fi

# Upload to S3 if configured
if [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${BACKUP_S3_ACCESS_KEY:-}" ]; then
    echo "[$(date)] Uploading backup to S3..."
    
    aws configure set aws_access_key_id "$BACKUP_S3_ACCESS_KEY"
    aws configure set aws_secret_access_key "$BACKUP_S3_SECRET_KEY"
    aws configure set default.region us-east-1
    
    aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/postgresql/" \
        --endpoint-url "$BACKUP_S3_ENDPOINT" \
        --storage-class STANDARD_IA
    
    echo "[$(date)] Backup uploaded to S3 successfully"
fi

# Clean up old local backups
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "ventalocal_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Send healthcheck ping
if [ -n "${HEALTHCHECK_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" > /dev/null || echo "[$(date)] Healthcheck ping failed"
fi

echo "[$(date)] PostgreSQL backup completed successfully"