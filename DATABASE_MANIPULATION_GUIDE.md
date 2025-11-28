# 🗄️ Database Manipulation Guide
## Direct Access untuk Edit, Delete, Update Data

---

## 🎯 **Opsi 1: MongoDB Compass** ⭐ RECOMMENDED

### **Setup:**

1. **Download MongoDB Compass:**
   ```
   https://www.mongodb.com/try/download/compass
   ```
   - Windows, Mac, atau Linux
   - Free GUI tool dari MongoDB

2. **Connection String Anda:**
   ```
   mongodb+srv://fieldtrack-15:PASSWORD@customer-apps-pri.oujud8.mongodb.net
   ```

3. **Connect:**
   - Buka Compass
   - Paste connection string
   - Click "Connect"
   - Done! ✅

### **Manipulasi Data di Compass:**

#### **A. View Data:**
- Select database: `field_tracker_db`
- Click collection: `surveys`, `users`, `respondents`, dll
- Browse all documents

#### **B. Edit Document:**
```
1. Find document you want to edit
2. Click pencil icon (✏️) or double-click
3. Edit JSON directly
4. Click "Update"
```

#### **C. Delete Document:**
```
1. Find document
2. Click trash icon (🗑️)
3. Confirm delete
```

#### **D. Insert New Document:**
```
1. Click "ADD DATA" button
2. Choose "Insert Document"
3. Paste JSON:
   {
     "title": "New Survey",
     "start_date": "2025-12-01T00:00:00",
     "end_date": "2025-12-31T00:00:00",
     "region_level": "province",
     "region_name": "Jakarta",
     "supervisor_ids": [],
     "enumerator_ids": [],
     "created_by": "admin_id",
     "created_at": "2025-11-28T00:00:00",
     "is_active": true,
     "geojson_path": null,
     "geojson_filter_field": null
   }
4. Click "Insert"
```

#### **E. Bulk Update:**
```javascript
// In Compass's Query Bar:
// Filter
{ "region_level": "district" }

// Update (click "Update" tab)
{ $set: { "is_active": false } }

// Click "Update All"
```

#### **F. Find & Query:**
```javascript
// Find specific survey
{ "title": "SE 2026" }

// Find active surveys
{ "is_active": true }

// Find by date range
{ 
  "start_date": { 
    "$gte": "2025-01-01T00:00:00" 
  } 
}
```

---

## 🎯 **Opsi 2: Web Interface dengan Edit** 🌐

### **Buatkan Web Interface untuk CRUD:**

Saya bisa buatkan web interface yang support:
- ✅ View data
- ✅ Edit inline
- ✅ Delete dengan confirm
- ✅ Add new document
- ✅ Bulk operations

**Mau saya buatkan?** (Akan available di browser)

---

## 🎯 **Opsi 3: Python Script untuk Manipulasi**

### **Script untuk Common Operations:**

```python
# File: /app/backend/db_manipulate.py
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

# Connect
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "field_tracker_db")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# ============================================
# SURVEYS MANIPULATION
# ============================================

def add_survey(data):
    """Add new survey"""
    result = db.surveys.insert_one(data)
    print(f"✅ Created survey: {result.inserted_id}")
    return str(result.inserted_id)

def update_survey(survey_id, updates):
    """Update survey by ID"""
    result = db.surveys.update_one(
        {"_id": ObjectId(survey_id)},
        {"$set": updates}
    )
    print(f"✅ Updated {result.modified_count} survey(s)")

def delete_survey(survey_id):
    """Delete survey by ID"""
    result = db.surveys.delete_one({"_id": ObjectId(survey_id)})
    print(f"✅ Deleted {result.deleted_count} survey(s)")

def bulk_update_surveys(query, updates):
    """Update multiple surveys"""
    result = db.surveys.update_many(query, {"$set": updates})
    print(f"✅ Updated {result.modified_count} survey(s)")

# ============================================
# USERS MANIPULATION
# ============================================

def add_user(data):
    """Add new user"""
    result = db.users.insert_one(data)
    print(f"✅ Created user: {result.inserted_id}")
    return str(result.inserted_id)

def update_user(user_id, updates):
    """Update user by ID"""
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    print(f"✅ Updated {result.modified_count} user(s)")

def delete_user(user_id):
    """Delete user by ID"""
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    print(f"✅ Deleted {result.deleted_count} user(s)")

# ============================================
# RESPONDENTS MANIPULATION
# ============================================

def add_respondent(data):
    """Add new respondent"""
    result = db.respondents.insert_one(data)
    print(f"✅ Created respondent: {result.inserted_id}")
    return str(result.inserted_id)

def update_respondent(respondent_id, updates):
    """Update respondent by ID"""
    result = db.respondents.update_one(
        {"_id": ObjectId(respondent_id)},
        {"$set": updates}
    )
    print(f"✅ Updated {result.modified_count} respondent(s)")

def delete_respondent(respondent_id):
    """Delete respondent by ID"""
    result = db.respondents.delete_one({"_id": ObjectId(respondent_id)})
    print(f"✅ Deleted {result.deleted_count} respondent(s)")

def bulk_update_respondents(query, updates):
    """Update multiple respondents"""
    result = db.respondents.update_many(query, {"$set": updates})
    print(f"✅ Updated {result.modified_count} respondent(s)")

# ============================================
# EXAMPLES
# ============================================

# Example 1: Add new survey
new_survey = {
    "title": "Test Survey 2025",
    "description": "Testing survey creation",
    "start_date": datetime(2025, 12, 1),
    "end_date": datetime(2025, 12, 31),
    "region_level": "province",
    "region_name": "Jakarta",
    "supervisor_ids": [],
    "enumerator_ids": [],
    "created_by": "admin_id",
    "created_at": datetime.utcnow(),
    "is_active": True,
    "geojson_path": None,
    "geojson_filter_field": None
}
# add_survey(new_survey)

# Example 2: Update survey
# update_survey("SURVEY_ID", {"region_name": "West Java Province"})

# Example 3: Bulk update - deactivate old surveys
# bulk_update_surveys(
#     {"end_date": {"$lt": datetime(2025, 1, 1)}},
#     {"is_active": False}
# )

# Example 4: Delete survey
# delete_survey("SURVEY_ID")

# Example 5: Update respondent status
# update_respondent("RESPONDENT_ID", {"status": "completed"})

# Example 6: Bulk update - assign enumerators to survey
# bulk_update_surveys(
#     {"region_level": "district"},
#     {"$addToSet": {"enumerator_ids": "NEW_ENUMERATOR_ID"}}
# )

if __name__ == "__main__":
    print("Database Manipulation Script")
    print("Uncomment examples above to use")
```

**Cara Pakai:**
```bash
cd /app/backend
python db_manipulate.py
```

---

## 🎯 **Opsi 4: MongoDB Shell (mongosh)**

### **Untuk Advanced Operations:**

```bash
# Connect
mongosh "mongodb+srv://fieldtrack-15:PASSWORD@customer-apps-pri.oujud8.mongodb.net/field_tracker_db"

# Then run commands:
```

### **Common Operations:**

#### **1. Update Single Document:**
```javascript
db.surveys.updateOne(
  { title: "SE 2026" },
  { $set: { region_name: "Updated Region Name" } }
)
```

#### **2. Update Multiple Documents:**
```javascript
db.surveys.updateMany(
  { region_level: "district" },
  { $set: { is_active: false } }
)
```

#### **3. Delete Document:**
```javascript
db.respondents.deleteOne(
  { _id: ObjectId("RESPONDENT_ID") }
)
```

#### **4. Delete Multiple:**
```javascript
db.respondents.deleteMany(
  { status: "pending", created_at: { $lt: ISODate("2025-01-01") } }
)
```

#### **5. Insert New:**
```javascript
db.surveys.insertOne({
  title: "New Survey",
  description: "Description",
  start_date: ISODate("2025-12-01"),
  end_date: ISODate("2025-12-31"),
  region_level: "province",
  region_name: "Jakarta",
  supervisor_ids: [],
  enumerator_ids: [],
  created_by: "admin_id",
  created_at: new Date(),
  is_active: true,
  geojson_path: null,
  geojson_filter_field: null
})
```

#### **6. Add to Array:**
```javascript
// Add enumerator to survey
db.surveys.updateOne(
  { _id: ObjectId("SURVEY_ID") },
  { $push: { enumerator_ids: "NEW_ENUMERATOR_ID" } }
)
```

#### **7. Remove from Array:**
```javascript
// Remove enumerator from survey
db.surveys.updateOne(
  { _id: ObjectId("SURVEY_ID") },
  { $pull: { enumerator_ids: "ENUMERATOR_ID_TO_REMOVE" } }
)
```

#### **8. Find & Replace:**
```javascript
db.surveys.findOneAndUpdate(
  { title: "Old Title" },
  { $set: { title: "New Title" } },
  { returnNewDocument: true }
)
```

---

## 📋 **Quick Reference:**

### **MongoDB Compass (GUI):**
- ✅ Best for: Visual editing, browsing data
- ✅ Easy: Drag & drop, click to edit
- ✅ Safe: See before you update
- ❌ Requires: Desktop app install

### **Python Script:**
- ✅ Best for: Bulk operations, automation
- ✅ Easy: Write once, run anytime
- ✅ Safe: Can test first
- ❌ Requires: Python knowledge

### **MongoDB Shell:**
- ✅ Best for: Quick operations, advanced queries
- ✅ Fast: Direct command line
- ✅ Powerful: All MongoDB features
- ❌ Requires: MongoDB syntax knowledge

### **Web Interface (Custom):**
- ✅ Best for: Browser-based, no install
- ✅ Easy: Click to edit
- ✅ Safe: Can add validation
- ⏳ Requires: Build by me (30 min)

---

## 🎯 **Recommendations:**

### **For Quick Edits:**
→ **MongoDB Compass** (GUI, easy, visual)

### **For Bulk Operations:**
→ **Python Script** (automated, repeatable)

### **For Advanced:**
→ **MongoDB Shell** (powerful, direct)

### **For Team Access:**
→ **Web Interface** (browser, accessible)

---

## 🔐 **Safety Tips:**

### **Before Manipulating:**
1. ✅ **Backup First!**
   ```bash
   /app/export_database.sh
   ```

2. ✅ **Test Query First:**
   ```javascript
   // Count affected documents
   db.surveys.countDocuments({ region_level: "district" })
   ```

3. ✅ **Use Find Before Update:**
   ```javascript
   // See what will be updated
   db.surveys.find({ region_level: "district" })
   
   // Then update
   db.surveys.updateMany(...)
   ```

4. ✅ **Use Transactions (if needed):**
   ```javascript
   session = db.getMongo().startSession()
   session.startTransaction()
   try {
     // Your operations
     session.commitTransaction()
   } catch (error) {
     session.abortTransaction()
   }
   ```

---

## 🆘 **Common Operations Examples:**

### **1. Deactivate Old Surveys:**
```javascript
db.surveys.updateMany(
  { end_date: { $lt: ISODate("2025-01-01") } },
  { $set: { is_active: false } }
)
```

### **2. Assign Enumerators to All Active Surveys:**
```javascript
db.surveys.updateMany(
  { is_active: true },
  { $addToSet: { enumerator_ids: { $each: ["enum1", "enum2"] } } }
)
```

### **3. Mark Completed Respondents:**
```javascript
db.respondents.updateMany(
  { survey_id: "SURVEY_ID", status: "in_progress" },
  { $set: { status: "completed", updated_at: new Date() } }
)
```

### **4. Delete Test Data:**
```javascript
db.respondents.deleteMany({ name: /test/i })
db.surveys.deleteMany({ title: /test/i })
```

### **5. Rename Field:**
```javascript
db.surveys.updateMany(
  {},
  { $rename: { "old_field": "new_field" } }
)
```

---

**Ready to manipulate? Choose your preferred method!** 🚀
