# 🚀 Database Quick Reference Guide

Panduan cepat untuk operasi database Field Tracker yang umum digunakan.

---

## 🔗 Akses Database

### Via MongoDB Compass
```
mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/field_tracker_db?retryWrites=true&w=majority&appName=Cluster0
```

### Via Web Browser
```
http://localhost:8001/database-viewer
```

### Via Python Script
```bash
cd /app/backend
python db_manipulate.py
```

---

## 📝 Operasi Umum

### 1. List Semua Surveys
```bash
cd /app/backend
python db_manipulate.py list-surveys
```

### 2. List Semua Users
```bash
cd /app/backend
python db_manipulate.py list-users
```

### 3. List Respondents (dengan filter survey)
```bash
cd /app/backend
python db_manipulate.py list-respondents SURVEY_ID
```

---

## 🔧 Update Survey

### Update Field Tertentu (Contoh: geojson_path)

```python
cd /app/backend
python -c "
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# Update by survey title
db.surveys.update_one(
    {'title': 'SE 2026'},
    {'\$set': {
        'geojson_path': 'assets/geom/paluta_kec.geojson',
        'geojson_filter_field': 'ADM3_EN'
    }}
)

print('✅ Update berhasil!')
client.close()
"
```

### Update by Survey ID

```python
cd /app/backend
python -c "
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# Update by ID
db.surveys.update_one(
    {'_id': ObjectId('6923d4adc985b472220ad0f0')},
    {'\$set': {
        'description': 'Updated description',
        'is_active': True
    }}
)

print('✅ Update berhasil!')
client.close()
"
```

---

## 🔍 Query/Search Data

### Cari Survey by Title
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

survey = db.surveys.find_one({'title': 'SE 2026'})
print(f'Survey ID: {survey[\"_id\"]}')
print(f'Region: {survey[\"region_name\"]}')
print(f'GeoJSON Path: {survey.get(\"geojson_path\")}')

client.close()
"
```

### Cari User by Email
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

user = db.users.find_one({'email': 'admin@example.com'})
print(f'User ID: {user[\"_id\"]}')
print(f'Username: {user[\"username\"]}')
print(f'Role: {user[\"role\"]}')

client.close()
"
```

### Count Documents in Collection
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

print(f'Surveys: {db.surveys.count_documents({})}')
print(f'Users: {db.users.count_documents({})}')
print(f'Respondents: {db.respondents.count_documents({})}')

client.close()
"
```

---

## 🗑️ Delete Data

### Delete Survey by Title
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# HATI-HATI! Operasi ini permanen
result = db.surveys.delete_one({'title': 'SURVEY_NAME_HERE'})
print(f'Deleted count: {result.deleted_count}')

client.close()
"
```

### Soft Delete (Deactivate Survey)
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# Lebih aman: set is_active = False
db.surveys.update_one(
    {'title': 'SURVEY_NAME_HERE'},
    {'\$set': {'is_active': False}}
)
print('✅ Survey di-deactivate')

client.close()
"
```

---

## 📊 Bulk Operations

### Update Multiple Surveys
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# Update semua survey dengan region tertentu
result = db.surveys.update_many(
    {'region_level': 'regency'},
    {'\$set': {'updated': True}}
)
print(f'Modified count: {result.modified_count}')

client.close()
"
```

### Bulk Insert (Import Data)
```python
cd /app/backend
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URL'))
db = client['field_tracker_db']

# Insert multiple documents
documents = [
    {'name': 'Test 1', 'value': 100},
    {'name': 'Test 2', 'value': 200}
]

result = db.test_collection.insert_many(documents)
print(f'Inserted count: {len(result.inserted_ids)}')

client.close()
"
```

---

## 🧪 Test Koneksi

```bash
cd /app/backend
python test_mongodb_connection.py
```

Output yang diharapkan:
```
✅ Successfully connected to MongoDB Atlas!
📊 Database: field_tracker_db
📁 Collections: users, surveys, respondents, locations, messages, faqs
```

---

## 🔐 Security Notes

### ⚠️ PENTING:
1. **Jangan share** connection string di public repositories
2. **Backup data** sebelum operasi delete/update besar
3. **Test di development** sebelum production
4. **Ganti password** database secara berkala

### Backup Database:
```bash
# Via mongodump (jika installed)
mongodump --uri="mongodb+srv://..." --out=/backup/path

# Via MongoDB Compass:
# Export → Select Collection → Export to JSON/CSV
```

---

## 📞 Troubleshooting

### Problem: Connection timeout
**Solusi:**
- Cek IP whitelist di Atlas Network Access
- Pastikan internet connection stable

### Problem: Authentication failed
**Solusi:**
- Verify username/password di connection string
- Cek Database Access di Atlas

### Problem: Data tidak update
**Solusi:**
- Restart backend: `sudo supervisorctl restart backend`
- Verify update: `python test_mongodb_connection.py`

---

## 🎯 Best Practices

1. **Always backup** sebelum major changes
2. **Use soft delete** (is_active flag) instead of hard delete
3. **Test queries** di MongoDB Compass dulu
4. **Monitor** Atlas dashboard untuk performance
5. **Index** fields yang sering di-query

---

## 📚 Resources

- **MongoDB Compass:** https://www.mongodb.com/try/download/compass
- **Atlas Dashboard:** https://cloud.mongodb.com/
- **MongoDB Docs:** https://docs.mongodb.com/

---

**Happy Database Management! 🚀**
