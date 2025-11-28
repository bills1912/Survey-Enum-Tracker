#!/usr/bin/env python3
"""
Database Access Script for Field Tracker App
Easy access to MongoDB data
"""

from pymongo import MongoClient
from bson import ObjectId
import json
from datetime import datetime
import os

# Connect to MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def show_collections():
    """Show all collections in database"""
    collections = db.list_collection_names()
    print("\n" + "="*50)
    print("📊 COLLECTIONS IN DATABASE")
    print("="*50)
    for col in collections:
        count = db[col].count_documents({})
        print(f"  ✓ {col:<20} {count:>6} documents")
    print("="*50)

def show_users():
    """Show all users"""
    users = list(db.users.find())
    print("\n" + "="*50)
    print("👥 USERS")
    print("="*50)
    if not users:
        print("  No users found")
        return
    
    for user in users:
        print(f"\n  Username: {user['username']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")
        print(f"  Active: {user.get('is_active', True)}")
        if 'supervisor_id' in user:
            print(f"  Supervisor ID: {user['supervisor_id']}")
        print(f"  Created: {user.get('created_at', 'N/A')}")
        print("  " + "-"*46)

def show_surveys():
    """Show all surveys"""
    surveys = list(db.surveys.find())
    print("\n" + "="*50)
    print("📋 SURVEYS")
    print("="*50)
    if not surveys:
        print("  No surveys found")
        return
    
    for survey in surveys:
        print(f"\n  Title: {survey['title']}")
        print(f"  Description: {survey.get('description', 'N/A')}")
        print(f"  Status: {survey['status']}")
        print(f"  Start: {survey['start_date']}")
        print(f"  End: {survey['end_date']}")
        print(f"  Target: {survey.get('target_respondents', 0)} respondents")
        
        # Count actual respondents
        resp_count = db.respondents.count_documents({"survey_id": str(survey['_id'])})
        print(f"  Actual: {resp_count} respondents")
        print("  " + "-"*46)

def show_respondents_by_survey(survey_id=None):
    """Show respondents for specific survey or all"""
    query = {}
    if survey_id:
        query = {"survey_id": survey_id}
    
    respondents = list(db.respondents.find(query))
    print("\n" + "="*50)
    print(f"👤 RESPONDENTS {f'(Survey: {survey_id})' if survey_id else '(All)'}")
    print("="*50)
    if not respondents:
        print("  No respondents found")
        return
    
    for resp in respondents:
        print(f"\n  Name: {resp['name']}")
        print(f"  Survey ID: {resp['survey_id']}")
        print(f"  Status: {resp['status']}")
        print(f"  Enumerator: {resp.get('enumerator_id', 'N/A')}")
        
        location = resp.get('location', {})
        if location:
            lat = location.get('latitude', 'N/A')
            lon = location.get('longitude', 'N/A')
            print(f"  Location: {lat}, {lon}")
        
        if 'phone' in resp:
            print(f"  Phone: {resp['phone']}")
        if 'address' in resp:
            print(f"  Address: {resp['address']}")
        
        print(f"  Created: {resp.get('created_at', 'N/A')}")
        print("  " + "-"*46)

def show_recent_locations(limit=10):
    """Show recent location updates"""
    locations = list(db.locations.find().sort("timestamp", -1).limit(limit))
    print("\n" + "="*50)
    print(f"📍 RECENT {limit} LOCATION UPDATES")
    print("="*50)
    if not locations:
        print("  No locations found")
        return
    
    for loc in locations:
        user = db.users.find_one({"_id": ObjectId(loc['user_id'])})
        username = user['username'] if user else loc['user_id']
        
        print(f"\n  User: {username}")
        print(f"  Location: {loc['latitude']}, {loc['longitude']}")
        print(f"  Accuracy: {loc.get('accuracy', 'N/A')}m")
        print(f"  Time: {loc['timestamp']}")
        print("  " + "-"*46)

def show_messages(message_type=None, limit=10):
    """Show recent messages"""
    query = {}
    if message_type:
        query = {"message_type": message_type}
    
    messages = list(db.messages.find(query).sort("timestamp", -1).limit(limit))
    print("\n" + "="*50)
    print(f"💬 MESSAGES {f'({message_type})' if message_type else ''}")
    print("="*50)
    if not messages:
        print("  No messages found")
        return
    
    for msg in messages:
        sender = db.users.find_one({"_id": ObjectId(msg['sender_id'])})
        sender_name = sender['username'] if sender else msg['sender_id']
        
        print(f"\n  From: {sender_name}")
        print(f"  Type: {msg['message_type']}")
        print(f"  Content: {msg['content'][:100]}...")
        if msg.get('response'):
            print(f"  Response: {msg['response'][:100]}...")
        print(f"  Answered: {msg.get('answered', False)}")
        print(f"  Time: {msg['timestamp']}")
        print("  " + "-"*46)

def get_stats():
    """Get database statistics"""
    print("\n" + "="*50)
    print("📊 DATABASE STATISTICS")
    print("="*50)
    
    print("\n  Document Counts:")
    print(f"    Users:        {db.users.count_documents({}):>6}")
    print(f"    Surveys:      {db.surveys.count_documents({}):>6}")
    print(f"    Respondents:  {db.respondents.count_documents({}):>6}")
    print(f"    Locations:    {db.locations.count_documents({}):>6}")
    print(f"    Messages:     {db.messages.count_documents({}):>6}")
    print(f"    FAQs:         {db.faqs.count_documents({}):>6}")
    
    print("\n  Respondents by Status:")
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    for result in db.respondents.aggregate(pipeline):
        print(f"    {result['_id']:<15} {result['count']:>6}")
    
    print("\n  Users by Role:")
    pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    for result in db.users.aggregate(pipeline):
        print(f"    {result['_id']:<15} {result['count']:>6}")
    
    print("\n  Surveys by Status:")
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    for result in db.surveys.aggregate(pipeline):
        print(f"    {result['_id']:<15} {result['count']:>6}")
    
    print("="*50)

def export_collection_to_json(collection_name, output_file):
    """Export collection to JSON file"""
    data = list(db[collection_name].find())
    
    # Convert ObjectId to string
    for item in data:
        if '_id' in item:
            item['_id'] = str(item['_id'])
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"\n✓ Exported {len(data)} documents from '{collection_name}' to '{output_file}'")

def search_user(email=None, username=None, role=None):
    """Search for users"""
    query = {}
    if email:
        query['email'] = email
    if username:
        query['username'] = username
    if role:
        query['role'] = role
    
    users = list(db.users.find(query))
    print(f"\n Found {len(users)} user(s)")
    for user in users:
        print(f"\n  Username: {user['username']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")

def interactive_menu():
    """Interactive menu for database access"""
    while True:
        print("\n" + "="*50)
        print("📊 FIELD TRACKER - DATABASE ACCESS")
        print("="*50)
        print("\n  1. Show Collections")
        print("  2. Show All Users")
        print("  3. Show All Surveys")
        print("  4. Show All Respondents")
        print("  5. Show Recent Locations")
        print("  6. Show Recent Messages")
        print("  7. Get Statistics")
        print("  8. Search User")
        print("  9. Export Collection")
        print("  0. Exit")
        print("\n" + "="*50)
        
        choice = input("\nEnter your choice: ").strip()
        
        if choice == '1':
            show_collections()
        elif choice == '2':
            show_users()
        elif choice == '3':
            show_surveys()
        elif choice == '4':
            survey_id = input("Enter survey ID (or press Enter for all): ").strip()
            show_respondents_by_survey(survey_id if survey_id else None)
        elif choice == '5':
            limit = input("Enter number of records (default 10): ").strip()
            show_recent_locations(int(limit) if limit else 10)
        elif choice == '6':
            msg_type = input("Enter message type (ai/supervisor or press Enter for all): ").strip()
            show_messages(msg_type if msg_type else None)
        elif choice == '7':
            get_stats()
        elif choice == '8':
            email = input("Enter email (or press Enter to skip): ").strip()
            username = input("Enter username (or press Enter to skip): ").strip()
            role = input("Enter role (or press Enter to skip): ").strip()
            search_user(
                email=email if email else None,
                username=username if username else None,
                role=role if role else None
            )
        elif choice == '9':
            collection = input("Enter collection name: ").strip()
            filename = input("Enter output filename: ").strip()
            export_collection_to_json(collection, filename)
        elif choice == '0':
            print("\n✓ Goodbye!\n")
            break
        else:
            print("\n❌ Invalid choice. Please try again.")
        
        input("\nPress Enter to continue...")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "stats":
            get_stats()
        elif command == "users":
            show_users()
        elif command == "surveys":
            show_surveys()
        elif command == "respondents":
            show_respondents_by_survey()
        elif command == "locations":
            show_recent_locations()
        elif command == "messages":
            show_messages()
        elif command == "collections":
            show_collections()
        else:
            print(f"Unknown command: {command}")
            print("\nAvailable commands:")
            print("  stats, users, surveys, respondents, locations, messages, collections")
    else:
        # Interactive mode
        interactive_menu()
