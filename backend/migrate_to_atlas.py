#!/usr/bin/env python3
"""
MongoDB Migration Script: Local to Atlas

This script migrates all data from local MongoDB to MongoDB Atlas
"""

from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Source: Local MongoDB
SOURCE_URL = "mongodb://localhost:27017"
SOURCE_DB = "field_tracker_db"

# Destination: MongoDB Atlas
DEST_URL = "mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/field_tracker_db?retryWrites=true&w=majority&appName=Cluster0"
DEST_DB = "field_tracker_db"

# Collections to migrate
COLLECTIONS = ['users', 'surveys', 'respondents', 'locations', 'messages', 'faqs']

def print_section(title):
    """Print formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def migrate_collection(source_db, dest_db, collection_name):
    """Migrate a single collection"""
    print(f"\n📦 Migrating collection: {collection_name}")
    
    # Get source collection
    source_coll = source_db[collection_name]
    source_count = source_coll.count_documents({})
    
    if source_count == 0:
        print(f"   ⚠️  Collection '{collection_name}' is empty - skipping")
        return 0
    
    print(f"   📊 Found {source_count} documents in source")
    
    # Get destination collection
    dest_coll = dest_db[collection_name]
    
    # Clear destination collection (fresh start)
    dest_count_before = dest_coll.count_documents({})
    if dest_count_before > 0:
        print(f"   🗑️  Clearing {dest_count_before} existing documents in destination")
        dest_coll.delete_many({})
    
    # Fetch all documents
    print(f"   ⏳ Fetching documents...")
    documents = list(source_coll.find())
    
    # Insert into destination
    print(f"   ⏳ Inserting into Atlas...")
    if documents:
        result = dest_coll.insert_many(documents)
        inserted_count = len(result.inserted_ids)
        print(f"   ✅ Successfully migrated {inserted_count} documents")
        
        # Verify
        dest_count_after = dest_coll.count_documents({})
        if dest_count_after == source_count:
            print(f"   ✅ Verification passed: {dest_count_after} documents in destination")
        else:
            print(f"   ⚠️  Verification warning: Expected {source_count}, got {dest_count_after}")
        
        return inserted_count
    
    return 0

def main():
    """Main migration function"""
    
    print_section("🚀 MongoDB Migration: Local → Atlas")
    
    print("\n📍 Source (Local):")
    print(f"   URL: {SOURCE_URL}")
    print(f"   Database: {SOURCE_DB}")
    
    print("\n📍 Destination (Atlas):")
    print(f"   URL: {DEST_URL[:50]}...")
    print(f"   Database: {DEST_DB}")
    
    # Connect to source
    print("\n⏳ Connecting to Local MongoDB...")
    try:
        source_client = MongoClient(SOURCE_URL, serverSelectionTimeoutMS=5000)
        source_client.admin.command('ping')
        source_db = source_client[SOURCE_DB]
        print("   ✅ Connected to Local MongoDB")
    except Exception as e:
        print(f"   ❌ Failed to connect to Local MongoDB: {e}")
        return False
    
    # Connect to destination
    print("\n⏳ Connecting to MongoDB Atlas...")
    try:
        dest_client = MongoClient(DEST_URL, serverSelectionTimeoutMS=10000)
        dest_client.admin.command('ping')
        dest_db = dest_client[DEST_DB]
        print("   ✅ Connected to MongoDB Atlas")
    except Exception as e:
        print(f"   ❌ Failed to connect to MongoDB Atlas: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check if IP address is whitelisted in Atlas Network Access")
        print("   2. Verify connection string is correct")
        print("   3. Try 'Allow Access from Anywhere' (0.0.0.0/0) for testing")
        return False
    
    # Summary of source data
    print_section("📊 Source Database Summary")
    total_docs = 0
    for coll_name in COLLECTIONS:
        count = source_db[coll_name].count_documents({})
        total_docs += count
        print(f"   • {coll_name:<20} {count:>6} documents")
    print(f"\n   Total: {total_docs} documents")
    
    # Confirm migration
    print("\n" + "="*70)
    print("⚠️  WARNING: This will REPLACE all data in Atlas with local data!")
    print("="*70)
    confirm = input("\n❓ Do you want to proceed? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("\n❌ Migration cancelled")
        return False
    
    # Perform migration
    print_section("🔄 Starting Migration")
    
    migration_summary = {}
    total_migrated = 0
    
    for coll_name in COLLECTIONS:
        try:
            count = migrate_collection(source_db, dest_db, coll_name)
            migration_summary[coll_name] = count
            total_migrated += count
        except Exception as e:
            print(f"   ❌ Error migrating {coll_name}: {e}")
            migration_summary[coll_name] = f"Error: {e}"
    
    # Final summary
    print_section("📋 Migration Summary")
    
    for coll_name, result in migration_summary.items():
        if isinstance(result, int):
            print(f"   ✅ {coll_name:<20} {result:>6} documents")
        else:
            print(f"   ❌ {coll_name:<20} {result}")
    
    print(f"\n   Total migrated: {total_migrated} documents")
    
    # Verify Atlas data
    print_section("✅ Verification - Atlas Database")
    atlas_total = 0
    for coll_name in COLLECTIONS:
        count = dest_db[coll_name].count_documents({})
        atlas_total += count
        print(f"   • {coll_name:<20} {count:>6} documents")
    print(f"\n   Total in Atlas: {atlas_total} documents")
    
    # Close connections
    source_client.close()
    dest_client.close()
    
    if atlas_total == total_docs:
        print_section("🎉 Migration Completed Successfully!")
        print("\n✅ All data has been migrated to MongoDB Atlas")
        print("\n📝 Next Steps:")
        print("   1. Backend .env will be updated to use Atlas")
        print("   2. Backend service will be restarted")
        print("   3. You can now access database via MongoDB Compass")
        return True
    else:
        print_section("⚠️ Migration Completed with Warnings")
        print(f"\n   Expected: {total_docs} documents")
        print(f"   Migrated: {atlas_total} documents")
        print("\n   Please review the migration summary above")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
