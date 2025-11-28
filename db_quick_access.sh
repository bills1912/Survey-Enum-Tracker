#!/bin/bash
# Quick Database Access Script
# Field Tracker App

echo "=================================="
echo "📊 DATABASE QUICK ACCESS"
echo "=================================="
echo ""
echo "Choose an option:"
echo "  1. MongoDB Shell (mongosh)"
echo "  2. View Statistics"
echo "  3. View All Users"
echo "  4. View All Surveys"
echo "  5. View All Respondents"
echo "  6. View Recent Locations"
echo "  7. Interactive Menu"
echo "  8. Export Data"
echo ""
read -p "Enter choice (1-8): " choice

case $choice in
  1)
    echo "Connecting to MongoDB..."
    mongosh "mongodb://localhost:27017/field_tracker_db"
    ;;
  2)
    python /app/backend/db_access.py stats
    ;;
  3)
    python /app/backend/db_access.py users
    ;;
  4)
    python /app/backend/db_access.py surveys
    ;;
  5)
    python /app/backend/db_access.py respondents
    ;;
  6)
    python /app/backend/db_access.py locations
    ;;
  7)
    python /app/backend/db_access.py
    ;;
  8)
    echo ""
    echo "Export options:"
    echo "  Available collections: users, surveys, respondents, locations, messages, faqs"
    echo ""
    read -p "Enter collection name: " collection
    read -p "Enter output filename (e.g., export.json): " filename
    mongoexport --db=field_tracker_db --collection=$collection --out=$filename --jsonArray
    echo "✓ Exported to $filename"
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
