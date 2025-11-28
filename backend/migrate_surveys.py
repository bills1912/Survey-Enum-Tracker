#!/usr/bin/env python3
"""
Migration script to update Survey collection to match new Dart model
"""
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def migrate_surveys():
    """Migrate existing surveys to new schema"""
    print("="*50)
    print("📦 SURVEY MIGRATION SCRIPT")
    print("="*50)
    
    surveys = list(db.surveys.find())
    print(f"\nFound {len(surveys)} surveys to migrate")
    
    if len(surveys) == 0:
        print("No surveys to migrate")
        return
    
    # Get all supervisors and enumerators for default assignment
    supervisors = list(db.users.find({"role": "supervisor"}))
    enumerators = list(db.users.find({"role": "enumerator"}))
    
    supervisor_ids = [str(s['_id']) for s in supervisors]
    enumerator_ids = [str(e['_id']) for e in enumerators]
    
    print(f"Found {len(supervisors)} supervisors and {len(enumerators)} enumerators")
    
    updated_count = 0
    
    for survey in surveys:
        survey_id = survey['_id']
        print(f"\nMigrating survey: {survey.get('title', 'Untitled')}")
        
        # Prepare update data
        update_data = {}
        
        # Add region_level (default to district if not present)
        if 'region_level' not in survey:
            update_data['region_level'] = 'district'
            print("  + Added region_level: district")
        
        # Add region_name (use existing or default)
        if 'region_name' not in survey:
            update_data['region_name'] = survey.get('title', 'Unknown Region')
            print(f"  + Added region_name: {update_data['region_name']}")
        
        # Add supervisor_ids
        if 'supervisor_ids' not in survey:
            update_data['supervisor_ids'] = supervisor_ids
            print(f"  + Added supervisor_ids: {len(supervisor_ids)} supervisors")
        
        # Add enumerator_ids
        if 'enumerator_ids' not in survey:
            update_data['enumerator_ids'] = enumerator_ids
            print(f"  + Added enumerator_ids: {len(enumerator_ids)} enumerators")
        
        # Add is_active (default to True)
        if 'is_active' not in survey:
            # Check status field if exists
            status = survey.get('status', 'active')
            update_data['is_active'] = status == 'active'
            print(f"  + Added is_active: {update_data['is_active']}")
        
        # Add geojson_path (null by default)
        if 'geojson_path' not in survey:
            update_data['geojson_path'] = None
            print("  + Added geojson_path: null")
        
        # Add geojson_filter_field (null by default)
        if 'geojson_filter_field' not in survey:
            update_data['geojson_filter_field'] = None
            print("  + Added geojson_filter_field: null")
        
        # Ensure created_at exists
        if 'created_at' not in survey:
            update_data['created_at'] = datetime.utcnow().isoformat()
            print(f"  + Added created_at: {update_data['created_at']}")
        
        # Update survey if there are changes
        if update_data:
            result = db.surveys.update_one(
                {"_id": survey_id},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                updated_count += 1
                print(f"  ✅ Updated survey: {survey_id}")
            else:
                print(f"  ⚠️ No changes needed for: {survey_id}")
        else:
            print("  ℹ️ Survey already up to date")
    
    print("\n" + "="*50)
    print(f"✅ MIGRATION COMPLETE!")
    print(f"   Updated: {updated_count}/{len(surveys)} surveys")
    print("="*50)
    
    # Show sample migrated survey
    sample = db.surveys.find_one()
    if sample:
        print("\n📋 Sample Survey Structure:")
        print(f"  ID: {sample['_id']}")
        print(f"  Title: {sample.get('title')}")
        print(f"  Region Level: {sample.get('region_level')}")
        print(f"  Region Name: {sample.get('region_name')}")
        print(f"  Supervisors: {len(sample.get('supervisor_ids', []))}")
        print(f"  Enumerators: {len(sample.get('enumerator_ids', []))}")
        print(f"  Is Active: {sample.get('is_active')}")
        print(f"  GeoJSON Path: {sample.get('geojson_path')}")
        print(f"  GeoJSON Filter: {sample.get('geojson_filter_field')}")

def verify_migration():
    """Verify all surveys have required fields"""
    print("\n" + "="*50)
    print("🔍 VERIFICATION")
    print("="*50)
    
    required_fields = [
        'title', 'start_date', 'end_date', 'region_level', 'region_name',
        'supervisor_ids', 'enumerator_ids', 'created_by', 'created_at', 'is_active'
    ]
    
    surveys = list(db.surveys.find())
    all_valid = True
    
    for survey in surveys:
        missing_fields = []
        for field in required_fields:
            if field not in survey:
                missing_fields.append(field)
        
        if missing_fields:
            all_valid = False
            print(f"❌ Survey '{survey.get('title')}' missing: {', '.join(missing_fields)}")
        else:
            print(f"✅ Survey '{survey.get('title')}' is valid")
    
    if all_valid:
        print("\n🎉 All surveys are valid!")
    else:
        print("\n⚠️ Some surveys need attention")
    
    return all_valid

if __name__ == "__main__":
    try:
        print("\nStarting migration...\n")
        migrate_surveys()
        verify_migration()
        print("\n✅ Migration completed successfully!\n")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
