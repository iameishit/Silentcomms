#!/usr/bin/env bash
# Backs up the Supabase Postgres database to a local, timestamped, gzipped
# SQL dump, and prunes backups older than $RETENTION_DAYS.
#
# Requires: pg_dump (matching your Postgres server major version), gzip.
#
# Usage:
#   ./scripts/backup-db.sh
#
# Cron example (daily at 3am):
#   0 3 * * * DATABASE_URL="postgresql://postgres:PASSWORD@db.nimlwojximnllvdmisba.supabase.co:5432/postgres" /path/to/scripts/backup-db.sh >> /var/log/silentcomms-backup.log 2>&1
#
# NOTE: Supabase's paid plans include managed point-in-time recovery — check
# your plan's dashboard (Database > Backups) before relying solely on this
# script. This script is a free-tier-friendly supplement, not a replacement
# for verifying what Supabase itself already covers on your plan.

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ -z "$DATABASE_URL" ]; then
	echo "Error: DATABASE_URL environment variable is not set." >&2
	echo "Example: postgresql://postgres:PASSWORD@db.nimlwojximnllvdmisba.supabase.co:5432/postgres" >&2
	exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="$BACKUP_DIR/silentcomms_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup to $OUTFILE ..."
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$OUTFILE"
echo "[$(date)] Backup complete: $(du -h "$OUTFILE" | cut -f1)"

echo "[$(date)] Pruning backups older than $RETENTION_DAYS days ..."
find "$BACKUP_DIR" -name "silentcomms_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo "[$(date)] Done."
