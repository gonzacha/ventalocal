#!/bin/bash
# File Backup Script for ComercioYA Platform (MinIO/uploads)
# Runs daily at 2:30 AM via cron

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/files"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/minio_${DATE}.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting file backup (MinIO data)..."

# Create compressed archive of MinIO data
tar -czf "$BACKUP_FILE" -C /data/minio .

# Verify backup was created and has content
if [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] File backup created successfully: $BACKUP_FILE"
    echo "[$(date)] Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "[$(date)] ERROR: File backup is empty or was not created!"
    exit 1
fi

# Upload to S3 if configured
if [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${BACKUP_S3_ACCESS_KEY:-}" ]; then
    echo "[$(date)] Uploading file backup to S3..."
    
    aws configure set aws_access_key_id "$BACKUP_S3_ACCESS_KEY"
    aws configure set aws_secret_access_key "$BACKUP_S3_SECRET_KEY"
    aws configure set default.region us-east-1
    
    aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/files/" \
        --endpoint-url "$BACKUP_S3_ENDPOINT" \
        --storage-class STANDARD_IA
    
    echo "[$(date)] File backup uploaded to S3 successfully"
fi

# Clean up old local backups
echo "[$(date)] Cleaning up file backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] File backup completed successfully"