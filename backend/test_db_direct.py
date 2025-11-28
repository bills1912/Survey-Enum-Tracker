#!/usr/bin/env python3
"""
Test PyMongo direct connection
"""

from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")

print(f"Connecting to: {MONGO_URL[:50]}...")
print(f"Database: {DB_NAME}\n")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Test 1: List collections
collections = db.list_collection_names()
print(f"Collections: {collections}\n")

# Test 2: Count documents
print("Document counts:")
for coll_name in ['surveys', 'users', 'respondents', 'locations']:
    try:
        count = db[coll_name].count_documents({})
        print(f"  {coll_name}: {count}")
    except Exception as e:
        print(f"  {coll_name}: Error - {e}")

# Test 3: Get one survey
print("\nFetching one survey:")
survey = db.surveys.find_one()
if survey:
    print(f"  Title: {survey.get('title')}")
    print(f"  ID: {survey.get('_id')}")
    print(f"  Keys: {list(survey.keys())}")
else:
    print("  No survey found!")

client.close()
