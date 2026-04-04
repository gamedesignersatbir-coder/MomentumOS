#!/usr/bin/env bash
# scripts/backup.sh — SQLite backup for MomentumOS
# Cron: 0 2 * * * /absolute/path/to/project/scripts/backup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DB_FILE="$REPO_ROOT/momentum-os.db"
BACKUP_DIR="$REPO_ROOT/data/backups"
KEEP=30

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/momentumos-${TIMESTAMP}.db"
cp "$DB_FILE" "$DEST"
echo "Backup created: $DEST"

BACKUP_COUNT="$(ls -1 "$BACKUP_DIR"/momentumos-*.db 2>/dev/null | wc -l)"
if [ "$BACKUP_COUNT" -gt "$KEEP" ]; then
  ls -1t "$BACKUP_DIR"/momentumos-*.db | tail -n +"$((KEEP + 1))" | xargs rm -f
  echo "Pruned old backups, keeping last $KEEP"
fi
