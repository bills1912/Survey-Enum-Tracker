#!/usr/bin/env python3
"""
MongoDB Atlas Connection Test Script

Script ini untuk test koneksi ke MongoDB Atlas dan menampilkan informasi database.
"""

import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def test_connection():
    """Test MongoDB connection and display database info"""
    
    print("\n" + "="*60)
    print("🔍 Testing MongoDB Atlas Connection")
    print("="*60 + "\n")
    
    # Get connection details from environment
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'field_tracker_db')
    
    if not mongo_url:
        print("❌ Error: MONGO_URL not found in .env file")
        return False
    
    print(f"📍 Connection URL: {mongo_url[:50]}...")
    print(f"📊 Database Name: {db_name}\n")
    
    try:
        # Create client
        print("⏳ Connecting to MongoDB Atlas...")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
        
        # Test connection by getting server info
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!\n")
        
        # Get database
        db = client[db_name]
        
        # List collections
        collections = await db.list_collection_names()
        print(f"📁 Collections found: {len(collections)}")
        
        if collections:
            print("\nCollection Details:")
            print("-" * 60)
            
            for collection_name in collections:
                collection = db[collection_name]
                count = await collection.count_documents({})
                print(f"  • {collection_name:<20} {count:>10} documents")
            
            print("-" * 60)
        else:
            print("\n⚠️  No collections found. Database is empty.")
            print("   This is normal for a new database.")
        
        # Test a simple query on users collection
        print("\n🔍 Testing query on 'users' collection...")
        users_collection = db['users']
        user_count = await users_collection.count_documents({})
        print(f"   Found {user_count} users in database")
        
        # Get one sample user (if exists)
        if user_count > 0:
            sample_user = await users_collection.find_one({})
            if sample_user:
                print("\n📝 Sample User:")
                print(f"   Username: {sample_user.get('username', 'N/A')}")
                print(f"   Email: {sample_user.get('email', 'N/A')}")
                print(f"   Role: {sample_user.get('role', 'N/A')}")
        
        print("\n" + "="*60)
        print("✅ Connection Test Successful!")
        print("="*60 + "\n")
        
        # Close connection
        client.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Connection Failed!")
        print(f"Error: {str(e)}\n")
        print("Troubleshooting Tips:")
        print("1. Check if IP address is whitelisted in MongoDB Atlas Network Access")
        print("2. Verify MONGO_URL in .env file is correct")
        print("3. Check username and password in connection string")
        print("4. Try 'Allow Access from Anywhere' (0.0.0.0/0) in Network Access")
        print("5. Wait 2-3 minutes after adding IP to whitelist\n")
        return False

if __name__ == "__main__":
    # Run the async test
    success = asyncio.run(test_connection())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
