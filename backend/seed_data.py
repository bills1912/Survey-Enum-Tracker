import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing data
    print("Clearing existing data...")
    await db.users.delete_many({})
    await db.respondents.delete_many({})
    await db.locations.delete_many({})
    await db.messages.delete_many({})
    await db.faqs.delete_many({})
    
    # Create users
    print("Creating users...")
    
    # Admin user
    admin = {
        "username": "admin",
        "email": "admin@fieldtracker.com",
        "password": pwd_context.hash("admin123"),
        "role": "admin",
        "created_at": datetime.utcnow()
    }
    admin_result = await db.users.insert_one(admin)
    admin_id = str(admin_result.inserted_id)
    
    # Supervisor user
    supervisor = {
        "username": "supervisor1",
        "email": "supervisor@fieldtracker.com",
        "password": pwd_context.hash("supervisor123"),
        "role": "supervisor",
        "created_at": datetime.utcnow()
    }
    supervisor_result = await db.users.insert_one(supervisor)
    supervisor_id = str(supervisor_result.inserted_id)
    
    # Enumerator users
    enumerator1 = {
        "username": "enumerator1",
        "email": "enum1@fieldtracker.com",
        "password": pwd_context.hash("enum123"),
        "role": "enumerator",
        "supervisor_id": supervisor_id,
        "created_at": datetime.utcnow()
    }
    enum1_result = await db.users.insert_one(enumerator1)
    enum1_id = str(enum1_result.inserted_id)
    
    enumerator2 = {
        "username": "enumerator2",
        "email": "enum2@fieldtracker.com",
        "password": pwd_context.hash("enum123"),
        "role": "enumerator",
        "supervisor_id": supervisor_id,
        "created_at": datetime.utcnow()
    }
    enum2_result = await db.users.insert_one(enumerator2)
    enum2_id = str(enum2_result.inserted_id)
    
    print(f"Created users: Admin, Supervisor, 2 Enumerators")
    
    # Create sample respondents
    print("Creating sample respondents...")
    
    respondents = [
        {
            "name": "Respondent 1",
            "location": {"latitude": -6.2088, "longitude": 106.8456},  # Jakarta area
            "status": "pending",
            "enumerator_id": enum1_id,
            "assigned_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Respondent 2",
            "location": {"latitude": -6.2150, "longitude": 106.8500},
            "status": "in_progress",
            "enumerator_id": enum1_id,
            "assigned_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Respondent 3",
            "location": {"latitude": -6.2200, "longitude": 106.8550},
            "status": "completed",
            "enumerator_id": enum1_id,
            "assigned_by": admin_id,
            "survey_data": {"answers": ["Yes", "No", "Maybe"]},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Respondent 4",
            "location": {"latitude": -6.2250, "longitude": 106.8600},
            "status": "pending",
            "enumerator_id": enum2_id,
            "assigned_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.respondents.insert_many(respondents)
    print(f"Created {len(respondents)} respondents")
    
    # Create FAQs
    print("Creating FAQs...")
    
    faqs = [
        {
            "question": "How do I start collecting data in offline mode?",
            "answer": "Simply open the survey form and fill it out. All data is automatically saved locally on your device. When you regain internet connection, the app will sync automatically.",
            "category": "offline",
            "created_at": datetime.utcnow()
        },
        {
            "question": "What should I do if GPS is not working?",
            "answer": "1. Make sure location permissions are enabled in your phone settings. 2. Go to an open area away from tall buildings. 3. Wait a few moments for GPS to acquire signal. 4. Restart the app if needed.",
            "category": "technical",
            "created_at": datetime.utcnow()
        },
        {
            "question": "How often does the app track my location?",
            "answer": "The app tracks your location every 5 minutes automatically in the background. This helps supervisors monitor field deployment without draining your battery.",
            "category": "location",
            "created_at": datetime.utcnow()
        },
        {
            "question": "Can I edit a completed survey?",
            "answer": "No, once a survey is marked as completed, it cannot be edited. Please review all answers carefully before marking as complete.",
            "category": "survey",
            "created_at": datetime.utcnow()
        },
        {
            "question": "What happens to my pending data when I'm offline?",
            "answer": "All survey responses, location updates, and messages are stored locally on your device. Once you regain internet connection, they will automatically sync to the server.",
            "category": "offline",
            "created_at": datetime.utcnow()
        },
        {
            "question": "How do I contact my supervisor?",
            "answer": "Use the Chat feature in the app. Select 'Supervisor' as the recipient. Your messages will be queued if you're offline and sent when you're back online.",
            "category": "communication",
            "created_at": datetime.utcnow()
        },
        {
            "question": "What information should I collect from respondents?",
            "answer": "Follow the survey questionnaire provided. Make sure to verify respondent identity, get consent, and answer all required fields accurately.",
            "category": "survey",
            "created_at": datetime.utcnow()
        },
        {
            "question": "How do I know if my data has been synced?",
            "answer": "Check the sync status indicator at the top of the app. Green means all data is synced, yellow means sync in progress, and red means you're offline with pending data.",
            "category": "technical",
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.faqs.insert_many(faqs)
    print(f"Created {len(faqs)} FAQs")
    
    print("\\n=== Seed Data Complete ===")
    print(f"\\nTest Credentials:")
    print(f"Admin: admin@fieldtracker.com / admin123")
    print(f"Supervisor: supervisor@fieldtracker.com / supervisor123")
    print(f"Enumerator 1: enum1@fieldtracker.com / enum123")
    print(f"Enumerator 2: enum2@fieldtracker.com / enum123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
