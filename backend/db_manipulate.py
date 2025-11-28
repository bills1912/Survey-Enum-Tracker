#!/usr/bin/env python3
"""
Database Manipulation Script
Easy CRUD operations for Field Tracker database
"""

from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# ============================================
# SURVEYS OPERATIONS
# ============================================

def list_surveys():
    """List all surveys"""
    surveys = list(db.surveys.find())
    print("\n" + "="*60)
    print("📋 SURVEYS")
    print("="*60)
    if not surveys:
        print("\n⚠️ No surveys found in database")
        return
    print(f"\nTotal surveys: {len(surveys)}\n")
    for s in surveys:
        print(f"\nID: {s['_id']}")
        print(f"  Title: {s['title']}")
        print(f"  Region: {s.get('region_name', 'N/A')}")
        print(f"  Active: {s.get('is_active', True)}")
        print(f"  Dates: {s.get('start_date', 'N/A')} - {s.get('end_date', 'N/A')}")

def add_survey(data):
    """Add new survey"""
    result = db.surveys.insert_one(data)
    print(f"✅ Created survey with ID: {result.inserted_id}")
    return str(result.inserted_id)

def update_survey(survey_id, updates):
    """Update survey by ID"""
    result = db.surveys.update_one(
        {"_id": ObjectId(survey_id)},
        {"$set": updates}
    )
    if result.modified_count > 0:
        print(f"✅ Updated survey: {survey_id}")
    else:
        print(f"⚠️ No changes or survey not found: {survey_id}")
    return result.modified_count

def delete_survey(survey_id):
    """Delete survey by ID"""
    result = db.surveys.delete_one({"_id": ObjectId(survey_id)})
    if result.deleted_count > 0:
        print(f"✅ Deleted survey: {survey_id}")
    else:
        print(f"⚠️ Survey not found: {survey_id}")
    return result.deleted_count

def bulk_update_surveys(query, updates):
    """Update multiple surveys"""
    result = db.surveys.update_many(query, {"$set": updates})
    print(f"✅ Updated {result.modified_count} survey(s)")
    return result.modified_count

# ============================================
# USERS OPERATIONS
# ============================================

def list_users():
    """List all users"""
    users = list(db.users.find())
    print("\n" + "="*60)
    print("👥 USERS")
    print("="*60)
    for u in users:
        print(f"\nID: {u['_id']}")
        print(f"  Username: {u['username']}")
        print(f"  Email: {u['email']}")
        print(f"  Role: {u['role']}")

def add_user(data):
    """Add new user"""
    result = db.users.insert_one(data)
    print(f"✅ Created user with ID: {result.inserted_id}")
    return str(result.inserted_id)

def update_user(user_id, updates):
    """Update user by ID"""
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    if result.modified_count > 0:
        print(f"✅ Updated user: {user_id}")
    else:
        print(f"⚠️ No changes or user not found: {user_id}")
    return result.modified_count

def delete_user(user_id):
    """Delete user by ID"""
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count > 0:
        print(f"✅ Deleted user: {user_id}")
    else:
        print(f"⚠️ User not found: {user_id}")
    return result.deleted_count

# ============================================
# RESPONDENTS OPERATIONS
# ============================================

def list_respondents(survey_id=None):
    """List respondents (optionally filtered by survey)"""
    query = {}
    if survey_id:
        query["survey_id"] = survey_id
    
    respondents = list(db.respondents.find(query))
    print("\n" + "="*60)
    print(f"👤 RESPONDENTS {f'(Survey: {survey_id})' if survey_id else ''}")
    print("="*60)
    for r in respondents:
        print(f"\nID: {r['_id']}")
        print(f"  Name: {r['name']}")
        print(f"  Survey ID: {r.get('survey_id', 'N/A')}")
        print(f"  Status: {r.get('status', 'N/A')}")

def add_respondent(data):
    """Add new respondent"""
    result = db.respondents.insert_one(data)
    print(f"✅ Created respondent with ID: {result.inserted_id}")
    return str(result.inserted_id)

def update_respondent(respondent_id, updates):
    """Update respondent by ID"""
    result = db.respondents.update_one(
        {"_id": ObjectId(respondent_id)},
        {"$set": updates}
    )
    if result.modified_count > 0:
        print(f"✅ Updated respondent: {respondent_id}")
    else:
        print(f"⚠️ No changes or respondent not found: {respondent_id}")
    return result.modified_count

def delete_respondent(respondent_id):
    """Delete respondent by ID"""
    result = db.respondents.delete_one({"_id": ObjectId(respondent_id)})
    if result.deleted_count > 0:
        print(f"✅ Deleted respondent: {respondent_id}")
    else:
        print(f"⚠️ Respondent not found: {respondent_id}")
    return result.deleted_count

def bulk_update_respondents(query, updates):
    """Update multiple respondents"""
    result = db.respondents.update_many(query, {"$set": updates})
    print(f"✅ Updated {result.modified_count} respondent(s)")
    return result.modified_count

# ============================================
# INTERACTIVE MENU
# ============================================

def menu():
    """Interactive menu"""
    while True:
        print("\n" + "="*60)
        print("🗄️ DATABASE MANIPULATION MENU")
        print("="*60)
        print("\n📋 SURVEYS:")
        print("  1. List all surveys")
        print("  2. Add survey")
        print("  3. Update survey")
        print("  4. Delete survey")
        print("  5. Bulk update surveys")
        
        print("\n👥 USERS:")
        print("  6. List all users")
        print("  7. Add user")
        print("  8. Update user")
        print("  9. Delete user")
        
        print("\n👤 RESPONDENTS:")
        print("  10. List all respondents")
        print("  11. Add respondent")
        print("  12. Update respondent")
        print("  13. Delete respondent")
        print("  14. Bulk update respondents")
        
        print("\n❌ OTHER:")
        print("  0. Exit")
        
        choice = input("\nEnter choice: ").strip()
        
        if choice == "1":
            list_surveys()
        elif choice == "2":
            print("\nExample survey data needed. Edit script to add survey.")
            print("Uncomment example in main section")
        elif choice == "3":
            survey_id = input("Survey ID: ").strip()
            field = input("Field to update: ").strip()
            value = input("New value: ").strip()
            update_survey(survey_id, {field: value})
        elif choice == "4":
            survey_id = input("Survey ID: ").strip()
            confirm = input(f"Delete survey {survey_id}? (yes/no): ").strip().lower()
            if confirm == "yes":
                delete_survey(survey_id)
        elif choice == "5":
            print("\nBulk update requires code editing")
            print("See examples in script")
        elif choice == "6":
            list_users()
        elif choice == "7":
            print("\nUser creation requires password hashing")
            print("Use backend API or edit script")
        elif choice == "8":
            user_id = input("User ID: ").strip()
            field = input("Field to update: ").strip()
            value = input("New value: ").strip()
            update_user(user_id, {field: value})
        elif choice == "9":
            user_id = input("User ID: ").strip()
            confirm = input(f"Delete user {user_id}? (yes/no): ").strip().lower()
            if confirm == "yes":
                delete_user(user_id)
        elif choice == "10":
            survey_id = input("Filter by survey ID (or press Enter for all): ").strip()
            list_respondents(survey_id if survey_id else None)
        elif choice == "11":
            print("\nRespondent creation requires full data")
            print("Use backend API or edit script")
        elif choice == "12":
            resp_id = input("Respondent ID: ").strip()
            field = input("Field to update: ").strip()
            value = input("New value: ").strip()
            update_respondent(resp_id, {field: value})
        elif choice == "13":
            resp_id = input("Respondent ID: ").strip()
            confirm = input(f"Delete respondent {resp_id}? (yes/no): ").strip().lower()
            if confirm == "yes":
                delete_respondent(resp_id)
        elif choice == "14":
            print("\nBulk update requires code editing")
            print("See examples in script")
        elif choice == "0":
            print("\n✅ Goodbye!\n")
            break
        else:
            print("\n❌ Invalid choice")
        
        input("\nPress Enter to continue...")

# ============================================
# EXAMPLES - Uncomment to use
# ============================================

def examples():
    """Usage examples"""
    
    # Example 1: Add new survey
    # new_survey = {
    #     "title": "Test Survey 2025",
    #     "description": "Testing survey creation",
    #     "start_date": datetime(2025, 12, 1),
    #     "end_date": datetime(2025, 12, 31),
    #     "region_level": "province",
    #     "region_name": "Jakarta",
    #     "supervisor_ids": [],
    #     "enumerator_ids": [],
    #     "created_by": "admin_id",
    #     "created_at": datetime.utcnow(),
    #     "is_active": True,
    #     "geojson_path": None,
    #     "geojson_filter_field": None
    # }
    # add_survey(new_survey)
    
    # Example 2: Update survey
    # update_survey("SURVEY_ID_HERE", {"region_name": "West Java Province"})
    
    # Example 3: Bulk update - deactivate old surveys
    # bulk_update_surveys(
    #     {"end_date": {"$lt": datetime(2025, 1, 1)}},
    #     {"is_active": False}
    # )
    
    # Example 4: Delete survey
    # delete_survey("SURVEY_ID_HERE")
    
    # Example 5: Update respondent status
    # update_respondent("RESPONDENT_ID_HERE", {"status": "completed"})
    
    # Example 6: Bulk update - assign enumerators
    # bulk_update_surveys(
    #     {"region_level": "district"},
    #     {"$addToSet": {"enumerator_ids": "NEW_ENUMERATOR_ID"}}
    # )
    
    # Example 7: Mark all pending respondents as in_progress
    # bulk_update_respondents(
    #     {"status": "pending"},
    #     {"status": "in_progress", "updated_at": datetime.utcnow()}
    # )
    
    pass

if __name__ == "__main__":
    print("="*60)
    print("🗄️ DATABASE MANIPULATION SCRIPT")
    print("="*60)
    print(f"\nConnected to: {DB_NAME}")
    print(f"MongoDB: {MONGO_URL[:50]}...")
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list-surveys":
            list_surveys()
        elif command == "list-users":
            list_users()
        elif command == "list-respondents":
            survey_id = sys.argv[2] if len(sys.argv) > 2 else None
            list_respondents(survey_id)
        elif command == "examples":
            print("\nSee examples() function in script")
            examples()
        else:
            print(f"\nUnknown command: {command}")
            print("\nAvailable commands:")
            print("  list-surveys")
            print("  list-users")
            print("  list-respondents [survey_id]")
            print("  examples")
    else:
        # Interactive mode
        menu()
