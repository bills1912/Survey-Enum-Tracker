#!/bin/bash
# Auto Export Database Script
# Export all collections to JSON files

EXPORT_DIR="/app/database_exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$EXPORT_DIR/backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "=================================="
echo "📦 DATABASE EXPORT SCRIPT"
echo "=================================="
echo "Time: $(date)"
echo "Export to: $BACKUP_DIR"
echo ""

# Export each collection
echo "Exporting users..."
mongoexport --db=field_tracker_db --collection=users --out="$BACKUP_DIR/users.json" --jsonArray

echo "Exporting surveys..."
mongoexport --db=field_tracker_db --collection=surveys --out="$BACKUP_DIR/surveys.json" --jsonArray

echo "Exporting respondents..."
mongoexport --db=field_tracker_db --collection=respondents --out="$BACKUP_DIR/respondents.json" --jsonArray

echo "Exporting locations..."
mongoexport --db=field_tracker_db --collection=locations --out="$BACKUP_DIR/locations.json" --jsonArray

echo "Exporting messages..."
mongoexport --db=field_tracker_db --collection=messages --out="$BACKUP_DIR/messages.json" --jsonArray

echo "Exporting faqs..."
mongoexport --db=field_tracker_db --collection=faqs --out="$BACKUP_DIR/faqs.json" --jsonArray

# Create compressed archive
echo ""
echo "Creating compressed archive..."
cd "$EXPORT_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"

# Get file sizes
ARCHIVE_SIZE=$(du -h "backup_$TIMESTAMP.tar.gz" | cut -f1)
DIR_SIZE=$(du -sh "backup_$TIMESTAMP" | cut -f1)

echo ""
echo "=================================="
echo "✅ EXPORT COMPLETE!"
echo "=================================="
echo "Directory: $BACKUP_DIR"
echo "Archive: backup_$TIMESTAMP.tar.gz ($ARCHIVE_SIZE)"
echo "Total Size: $DIR_SIZE"
echo ""
echo "Files exported:"
ls -lh "$BACKUP_DIR"
echo ""
echo "To download this backup, use:"
echo "  - From web: https://field-monitor-5.preview.emergentagent.com/api/download/backup_$TIMESTAMP.tar.gz"
echo "  - Or copy from: $EXPORT_DIR/backup_$TIMESTAMP.tar.gz"
