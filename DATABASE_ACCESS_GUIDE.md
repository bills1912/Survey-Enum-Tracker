# 📊 Database Access Guide - Field Tracker App

## 🔐 **Database Information**

### **Connection Details:**
- **URL:** `mongodb://localhost:27017`
- **Database Name:** `field_tracker_db`
- **Type:** MongoDB
- **Access:** Local (inside container)

---

## 📋 **Collections Overview**

### **Collections in Database:**
1. **users** - User accounts (admin, supervisor, enumerator)
2. **surveys** - Survey definitions
3. **respondents** - Survey respondents data
4. **locations** - GPS tracking data
5. **messages** - Chat messages (AI & supervisor)
6. **faqs** - Frequently asked questions

---

## 🛠️ **Method 1: MongoDB Shell (mongosh)**

### **Connect to Database:**
```bash
mongosh "mongodb://localhost:27017/field_tracker_db"
```

### **Common Commands:**

#### **1. Show All Collections:**
```javascript
show collections
```

#### **2. Count Documents:**
```javascript
db.users.countDocuments()
db.surveys.countDocuments()
db.respondents.countDocuments()
db.locations.countDocuments()
```

#### **3. Find All Users:**
```javascript
db.users.find().pretty()
```

#### **4. Find Specific User:**
```javascript
// By email
db.users.findOne({ email: "admin@example.com" })

// By role
db.users.find({ role: "enumerator" }).pretty()
```

#### **5. Find All Surveys:**
```javascript
db.surveys.find().pretty()
```

#### **6. Find Respondents by Survey:**
```javascript
// Replace with actual survey_id
db.respondents.find({ survey_id: "SURVEY_ID_HERE" }).pretty()
```

#### **7. Find Recent Locations:**
```javascript
db.locations.find().sort({ timestamp: -1 }).limit(10).pretty()
```

#### **8. Find Messages:**
```javascript
// AI messages
db.messages.find({ message_type: "ai" }).pretty()

// Supervisor messages
db.messages.find({ message_type: "supervisor" }).pretty()
```

#### **9. Aggregate Stats:**
```javascript
// Respondents by status
db.respondents.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])
```

#### **10. Export Collection:**
```javascript
// Get all data
db.respondents.find().forEach(printjson)
```

---

## 🐍 **Method 2: Python Script**

### **Create Python Access Script:**

```python
# File: /app/backend/db_access.py
from pymongo import MongoClient
from bson import ObjectId
import json
from datetime import datetime

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["field_tracker_db"]

def show_collections():
    """Show all collections in database"""
    collections = db.list_collection_names()
    print("\\nCollections in database:")
    for col in collections:
        count = db[col].count_documents({})
        print(f"  - {col}: {count} documents")

def show_users():
    """Show all users"""
    users = db.users.find()
    print("\\nUsers:")
    for user in users:
        print(f"  - {user['username']} ({user['email']}) - Role: {user['role']}")

def show_surveys():
    """Show all surveys"""
    surveys = db.surveys.find()
    print("\\nSurveys:")
    for survey in surveys:
        print(f"  - {survey['title']} - Status: {survey['status']}")
        print(f"    Start: {survey['start_date']} | End: {survey['end_date']}")

def show_respondents_by_survey(survey_id):
    """Show respondents for specific survey"""
    respondents = db.respondents.find({"survey_id": survey_id})
    print(f"\\nRespondents for survey {survey_id}:")
    for resp in respondents:
        print(f"  - {resp['name']} - Status: {resp['status']}")
        print(f"    Location: {resp.get('location', {}).get('latitude', 'N/A')}, {resp.get('location', {}).get('longitude', 'N/A')}")

def show_recent_locations(limit=10):
    """Show recent location updates"""
    locations = db.locations.find().sort("timestamp", -1).limit(limit)
    print(f"\\nRecent {limit} location updates:")
    for loc in locations:
        print(f"  - User: {loc['user_id']}")
        print(f"    Location: {loc['latitude']}, {loc['longitude']}")
        print(f"    Time: {loc['timestamp']}")

def export_collection_to_json(collection_name, output_file):
    """Export collection to JSON file"""
    data = list(db[collection_name].find())
    # Convert ObjectId to string
    for item in data:
        if '_id' in item:
            item['_id'] = str(item['_id'])
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"\\nExported {collection_name} to {output_file}")

def get_stats():
    """Get database statistics"""
    print("\\n=== Database Statistics ===")
    print(f"Total Users: {db.users.count_documents({})}")
    print(f"Total Surveys: {db.surveys.count_documents({})}")
    print(f"Total Respondents: {db.respondents.count_documents({})}")
    print(f"Total Locations: {db.locations.count_documents({})}")
    print(f"Total Messages: {db.messages.count_documents({})}")
    print(f"Total FAQs: {db.faqs.count_documents({})}")
    
    print("\\nRespondents by Status:")
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    for result in db.respondents.aggregate(pipeline):
        print(f"  - {result['_id']}: {result['count']}")
    
    print("\\nUsers by Role:")
    pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    for result in db.users.aggregate(pipeline):
        print(f"  - {result['_id']}: {result['count']}")

if __name__ == "__main__":
    print("=== Field Tracker Database Access ===")
    
    # Show overview
    show_collections()
    get_stats()
    
    # Show data
    show_users()
    show_surveys()
    show_recent_locations(5)
    
    # Export examples (uncomment to use)
    # export_collection_to_json("users", "/app/backend/exports/users.json")
    # export_collection_to_json("surveys", "/app/backend/exports/surveys.json")
    # export_collection_to_json("respondents", "/app/backend/exports/respondents.json")
```

### **Run Python Script:**
```bash
cd /app/backend
python db_access.py
```

---

## 📤 **Method 3: Export Data**

### **Export to JSON:**
```bash
# Export users
mongoexport --db=field_tracker_db --collection=users --out=/app/backend/exports/users.json --jsonArray

# Export surveys
mongoexport --db=field_tracker_db --collection=surveys --out=/app/backend/exports/surveys.json --jsonArray

# Export respondents
mongoexport --db=field_tracker_db --collection=respondents --out=/app/backend/exports/respondents.json --jsonArray

# Export locations
mongoexport --db=field_tracker_db --collection=locations --out=/app/backend/exports/locations.json --jsonArray
```

### **Import Data:**
```bash
# Import users
mongoimport --db=field_tracker_db --collection=users --file=/app/backend/exports/users.json --jsonArray

# Import with upsert
mongoimport --db=field_tracker_db --collection=users --file=/app/backend/exports/users.json --jsonArray --mode=upsert
```

---

## 🔍 **Method 4: Query via API**

### **Using curl (from container):**

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.token')

# Get all users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/users

# Get all surveys
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/surveys

# Get all respondents
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/respondents

# Get locations
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/locations/latest
```

---

## 🛡️ **Backup & Restore**

### **Backup Entire Database:**
```bash
# Backup to directory
mongodump --db=field_tracker_db --out=/app/backend/backups/$(date +%Y%m%d)

# Backup with compression
mongodump --db=field_tracker_db --archive=/app/backend/backups/backup_$(date +%Y%m%d).gz --gzip
```

### **Restore Database:**
```bash
# Restore from directory
mongorestore --db=field_tracker_db /app/backend/backups/20250125

# Restore from archive
mongorestore --db=field_tracker_db --archive=/app/backend/backups/backup_20250125.gz --gzip
```

---

## 📊 **Useful Queries**

### **1. Find Users with Specific Criteria:**
```javascript
// Active enumerators
db.users.find({ 
  role: "enumerator",
  is_active: true 
}).pretty()

// Users created in last 7 days
db.users.find({
  created_at: { 
    $gte: new Date(Date.now() - 7*24*60*60*1000) 
  }
}).pretty()
```

### **2. Survey Statistics:**
```javascript
// Surveys by status
db.surveys.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Survey with most respondents
db.respondents.aggregate([
  { $group: { _id: "$survey_id", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 5 }
])
```

### **3. Location Tracking:**
```javascript
// Locations by user
db.locations.aggregate([
  { $group: { _id: "$user_id", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Recent locations for specific user
db.locations.find({ 
  user_id: "USER_ID_HERE" 
}).sort({ timestamp: -1 }).limit(10).pretty()
```

### **4. Respondent Analysis:**
```javascript
// Respondents by status per survey
db.respondents.aggregate([
  { 
    $group: { 
      _id: { survey: "$survey_id", status: "$status" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.survey": 1, "_id.status": 1 } }
])

// Completed respondents
db.respondents.find({ status: "completed" }).count()
```

---

## 🔧 **Database Maintenance**

### **1. Check Database Size:**
```javascript
db.stats()
```

### **2. Check Collection Size:**
```javascript
db.respondents.stats()
```

### **3. Create Index (if needed):**
```javascript
// Index on email for faster user lookup
db.users.createIndex({ email: 1 }, { unique: true })

// Index on survey_id for faster respondent queries
db.respondents.createIndex({ survey_id: 1 })

// Index on timestamp for faster location queries
db.locations.createIndex({ timestamp: -1 })
```

### **4. View Existing Indexes:**
```javascript
db.users.getIndexes()
db.respondents.getIndexes()
```

---

## 📝 **Quick Reference**

### **Connection String:**
```
mongodb://localhost:27017/field_tracker_db
```

### **Admin Credentials:**
```
Email: admin@example.com
Password: admin123
```

### **Sample User Credentials:**
```
Supervisor:
- Email: supervisor1@example.com
- Password: super123

Enumerator:
- Email: enum1@example.com
- Password: enum123
```

---

## 🚀 **Quick Start Commands**

```bash
# 1. Connect to MongoDB
mongosh "mongodb://localhost:27017/field_tracker_db"

# 2. Show all collections
show collections

# 3. Get overview
db.users.countDocuments()
db.surveys.countDocuments()
db.respondents.countDocuments()

# 4. Find all users
db.users.find().pretty()

# 5. Exit
exit
```

---

## 📞 **Need Help?**

Jika Anda perlu:
- Export data dalam format tertentu
- Query custom untuk analisis
- Backup/restore specific collections
- Modify data secara bulk

Silakan beri tahu saya requirement-nya!

---

**Last Updated:** 25 November 2025  
**Database:** MongoDB 7.x  
**Application:** Field Tracker v1.0.0
