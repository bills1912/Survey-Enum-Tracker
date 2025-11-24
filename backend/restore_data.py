import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def restore_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Starting data restoration...")
    
    # Keep surveys as they are
    surveys = await db.surveys.find().to_list(None)
    print(f"Found {len(surveys)} existing surveys")
    
    # Clear only users, respondents, locations, messages (keep surveys and faqs)
    print("Clearing user-related data...")
    await db.users.delete_many({})
    await db.respondents.delete_many({})
    await db.locations.delete_many({})
    await db.messages.delete_many({})
    
    # Create users with proper structure
    print("Creating comprehensive user base...")
    
    # Admin user
    admin = {
        "username": "admin",
        "email": "admin@example.com",
        "password": pwd_context.hash("admin123"),
        "role": "admin",
        "created_at": datetime.utcnow()
    }
    admin_result = await db.users.insert_one(admin)
    admin_id = str(admin_result.inserted_id)
    print(f"Created Admin: {admin_id}")
    
    # Supervisors (3 supervisors)
    supervisors = []
    for i in range(1, 4):
        supervisor = {
            "username": f"supervisor{i}",
            "email": f"supervisor{i}@example.com",
            "password": pwd_context.hash("supervisor123"),
            "role": "supervisor",
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(supervisor)
        supervisors.append(str(result.inserted_id))
        print(f"Created Supervisor {i}: {result.inserted_id}")
    
    # Enumerators (10 enumerators, distributed among supervisors)
    enumerators = []
    for i in range(1, 11):
        supervisor_id = supervisors[(i-1) % len(supervisors)]  # Distribute evenly
        enumerator = {
            "username": f"enumerator{i}",
            "email": f"enum{i}@example.com",
            "password": pwd_context.hash("enum123"),
            "role": "enumerator",
            "supervisor_id": supervisor_id,
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(enumerator)
        enumerators.append(str(result.inserted_id))
        print(f"Created Enumerator {i}: {result.inserted_id}")
    
    # Update surveys with new user IDs
    print("\nUpdating surveys with new user IDs...")
    for survey in surveys:
        # Assign supervisors and enumerators to surveys
        num_supervisors = min(2, len(supervisors))
        num_enumerators = min(5, len(enumerators))
        
        assigned_supervisors = random.sample(supervisors, num_supervisors)
        assigned_enumerators = random.sample(enumerators, num_enumerators)
        
        await db.surveys.update_one(
            {"_id": survey["_id"]},
            {
                "$set": {
                    "supervisor_ids": assigned_supervisors,
                    "enumerator_ids": assigned_enumerators,
                    "created_by": admin_id
                }
            }
        )
        print(f"Updated survey: {survey['title']}")
    
    # Create comprehensive respondents for each survey
    print("\nCreating respondents for each survey...")
    statuses = ["pending", "in_progress", "completed"]
    respondent_count = 0
    
    for survey in surveys:
        survey_id = str(survey["_id"])
        assigned_enumerators = (await db.surveys.find_one({"_id": survey["_id"]}))["enumerator_ids"]
        
        # Create 20-30 respondents per survey
        num_respondents = random.randint(20, 30)
        
        for i in range(num_respondents):
            enumerator_id = random.choice(assigned_enumerators)
            status = random.choices(
                statuses, 
                weights=[0.2, 0.3, 0.5]  # More completed respondents
            )[0]
            
            # Generate random coordinates around a central point
            base_lat = -6.2 + random.uniform(-0.5, 0.5)
            base_lng = 106.8 + random.uniform(-0.5, 0.5)
            
            respondent = {
                "survey_id": survey_id,
                "name": f"Respondent {i+1} - {survey['title'][:20]}",
                "phone": f"08{random.randint(1000000000, 9999999999)}",
                "address": f"Jl. Survey {i+1}, RT {random.randint(1,10)}/RW {random.randint(1,5)}, {survey['region_name']}",
                "latitude": base_lat,
                "longitude": base_lng,
                "status": status,
                "enumerator_id": enumerator_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.respondents.insert_one(respondent)
            respondent_count += 1
    
    print(f"Created {respondent_count} respondents across all surveys")
    
    # Create location tracking data for enumerators
    print("\nCreating location tracking data...")
    location_count = 0
    
    for enumerator_id in enumerators:
        # Create 5-10 location points per enumerator (last 24 hours)
        num_locations = random.randint(5, 10)
        
        for i in range(num_locations):
            hours_ago = (num_locations - i) * 2  # Every 2 hours
            timestamp = datetime.utcnow() - timedelta(hours=hours_ago)
            
            location = {
                "user_id": enumerator_id,
                "latitude": -6.2 + random.uniform(-0.3, 0.3),
                "longitude": 106.8 + random.uniform(-0.3, 0.3),
                "timestamp": timestamp,
                "accuracy": random.uniform(5.0, 20.0),
                "battery_level": random.randint(20, 100)
            }
            
            await db.locations.insert_one(location)
            location_count += 1
    
    print(f"Created {location_count} location tracking points")
    
    # Create sample messages
    print("\nCreating sample messages...")
    message_templates = [
        "How do I handle respondents who are not at home?",
        "Can I reschedule interviews for tomorrow?",
        "I'm having trouble with the survey form section 3",
        "Is internet connection required for data submission?",
        "What should I do if respondent refuses to participate?"
    ]
    
    message_count = 0
    for i, enumerator_id in enumerate(enumerators[:5]):  # First 5 enumerators send messages
        supervisor_id = supervisors[i % len(supervisors)]
        
        # AI message
        ai_message = {
            "message_type": "ai",
            "content": random.choice(message_templates),
            "sender_id": enumerator_id,
            "timestamp": datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
            "answered": True,
            "response": "Thank you for your question. Please refer to the field manual section 4.2 for detailed procedures. If you need further assistance, contact your supervisor."
        }
        await db.messages.insert_one(ai_message)
        
        # Supervisor message
        supervisor_message = {
            "message_type": "supervisor",
            "content": "I need guidance on handling this situation",
            "sender_id": enumerator_id,
            "receiver_id": supervisor_id,
            "timestamp": datetime.utcnow() - timedelta(hours=random.randint(1, 12)),
            "answered": False
        }
        await db.messages.insert_one(supervisor_message)
        message_count += 2
    
    print(f"Created {message_count} sample messages")
    
    # Print summary
    print("\n" + "="*50)
    print("DATA RESTORATION COMPLETE")
    print("="*50)
    print(f"\nUsers:")
    print(f"  - Admin: 1")
    print(f"  - Supervisors: {len(supervisors)}")
    print(f"  - Enumerators: {len(enumerators)}")
    print(f"\nSurveys: {len(surveys)} (preserved)")
    print(f"Respondents: {respondent_count}")
    print(f"Location Tracking Points: {location_count}")
    print(f"Messages: {message_count}")
    print(f"FAQs: {await db.faqs.count_documents({})}")
    
    print(f"\n{'='*50}")
    print("LOGIN CREDENTIALS")
    print("="*50)
    print(f"\nAdmin:")
    print(f"  Email: admin@example.com")
    print(f"  Password: admin123")
    print(f"\nSupervisors (1-3):")
    print(f"  Email: supervisor[1-3]@example.com")
    print(f"  Password: supervisor123")
    print(f"\nEnumerators (1-10):")
    print(f"  Email: enum[1-10]@example.com")
    print(f"  Password: enum123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(restore_database())
