# 🗄️ Database Persistence Guide
## Opsi untuk Always-Accessible Database

---

## 📊 **Current Situation:**

**Environment:** Development Container (Temporary)
- ⚠️ Container sleep jika tidak ada activity
- ⚠️ Database tidak accessible saat container sleep
- ⚠️ Data hilang jika container di-reset (kecuali di-backup)

**Database:** MongoDB @ localhost:27017
- ✅ Data: 14 users, 5 surveys, 148 respondents, 396 locations

---

## 🎯 **4 Opsi untuk Persistent Database:**

### **Opsi 1: Export & Download Data** ⭐ **TERCEPAT**

**Pros:**
- ✅ Gratis
- ✅ Tidak perlu setup kompleks
- ✅ Data tetap aman di local machine Anda
- ✅ Bisa restore kapan saja

**Cons:**
- ❌ Tidak real-time
- ❌ Perlu export manual berkala

**Cara:**
```bash
# 1. Export database (sudah dilakukan!)
/app/export_database.sh

# 2. Download dari:
https://fieldtrack-15.preview.emergentagent.com/api/download/backup_TIMESTAMP.tar.gz

# 3. Extract & view:
tar -xzf backup_TIMESTAMP.tar.gz
cd backup_TIMESTAMP
cat users.json
```

**Export sudah dilakukan:**
- File: `/app/database_exports/backup_20251128_021633.tar.gz`
- Size: 24KB (compressed), 184KB (raw)
- Collections: users, surveys, respondents, locations, messages, faqs

---

### **Opsi 2: MongoDB Atlas (Cloud Database)** ⭐ **RECOMMENDED**

**Pros:**
- ✅ Always online (24/7)
- ✅ Free tier: 512MB storage
- ✅ Backup otomatis
- ✅ Accessible dari mana saja
- ✅ No maintenance

**Cons:**
- ⚠️ Perlu setup account
- ⚠️ Perlu migrate data

**Setup Steps:**

#### **A. Create MongoDB Atlas Account:**
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create Free Cluster (M0 - 512MB)
4. Wait 5-10 minutes untuk cluster ready

#### **B. Get Connection String:**
1. Click "Connect" di cluster
2. Choose "Connect your application"
3. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/field_tracker_db
   ```

#### **C. Migrate Data:**
```bash
# Import ke Atlas
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net" \
  --nsInclude="field_tracker_db.*" \
  /app/database_exports/backup_20251128_021633
```

#### **D. Update Backend:**
Edit `/app/backend/.env`:
```env
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net"
DB_NAME="field_tracker_db"
```

#### **E. Rebuild & Deploy:**
```bash
# Backend akan connect ke Atlas
sudo supervisorctl restart backend
```

**Result:**
- ✅ Database always accessible
- ✅ No sleep issues
- ✅ Backup otomatis by Atlas
- ✅ Bisa akses dari multiple apps

---

### **Opsi 3: Deploy ke Production (Emergent Native)** 💰 **PAID**

**Pros:**
- ✅ Always online
- ✅ Professional deployment
- ✅ Persistent storage
- ✅ Custom domain

**Cons:**
- ⚠️ Perlu subscription Emergent
- ⚠️ Setup deployment

**Steps:**
1. Subscribe ke Emergent deployment plan
2. Deploy aplikasi via dashboard
3. Database akan persistent di production
4. Custom domain available

**Info lebih lanjut:**
- Contact Emergent support
- Check deployment pricing

---

### **Opsi 4: Self-Hosting (VPS)** 🔧 **ADVANCED**

**Pros:**
- ✅ Full control
- ✅ Custom configuration
- ✅ Always online

**Cons:**
- ⚠️ Perlu maintain server
- ⚠️ Perlu setup Docker/MongoDB
- ⚠️ Cost VPS monthly

**Providers:**
- DigitalOcean ($6/month)
- AWS EC2 (Free tier 12 months)
- Google Cloud (Free tier)
- Heroku (limited free tier)

**Setup:**
1. Provision VPS
2. Install Docker
3. Run MongoDB container
4. Import data
5. Configure firewall & security
6. Update backend connection string

---

## 🚀 **Quick Start: Opsi 1 (Export & Download)**

### **Step 1: Export Database (DONE!)**
```bash
/app/export_database.sh
```

**Result:**
```
✅ Exported to: /app/database_exports/backup_20251128_021633/
✅ Archive: backup_20251128_021633.tar.gz (24KB)
✅ Collections: 6 files (users, surveys, respondents, locations, messages, faqs)
```

### **Step 2: Download Backup**

**Method A: Via API (jika endpoint added):**
```
https://fieldtrack-15.preview.emergentagent.com/api/download/backup_20251128_021633.tar.gz
```

**Method B: Via Command:**
```bash
# Copy file dari container (jika ada access)
cp /app/database_exports/backup_20251128_021633.tar.gz ~/Downloads/
```

### **Step 3: View Data Locally**
```bash
# Extract
tar -xzf backup_20251128_021633.tar.gz

# View users
cat backup_20251128_021633/users.json | jq .

# View surveys
cat backup_20251128_021633/surveys.json | jq .

# Import ke local MongoDB
mongoimport --db=field_tracker_local \
  --collection=users \
  --file=backup_20251128_021633/users.json \
  --jsonArray
```

---

## 📊 **Comparison Table:**

| Feature | Export/Download | MongoDB Atlas | Production Deploy | Self-Host |
|---------|----------------|---------------|-------------------|-----------|
| **Cost** | Free ✅ | Free tier ✅ | Paid ⚠️ | $6+/month ⚠️ |
| **Setup Time** | 5 min ✅ | 15 min ✅ | Varies ⚠️ | 1-2 hours ⚠️ |
| **Always Online** | No ❌ | Yes ✅ | Yes ✅ | Yes ✅ |
| **Real-time** | No ❌ | Yes ✅ | Yes ✅ | Yes ✅ |
| **Maintenance** | None ✅ | None ✅ | Low ✅ | High ⚠️ |
| **Scalability** | N/A | High ✅ | High ✅ | Medium ⚠️ |

---

## 💡 **Recommendation by Use Case:**

### **Development/Testing:**
→ **Opsi 1: Export & Download**
- Quick backup
- Local access
- No cost

### **Production (Small Scale):**
→ **Opsi 2: MongoDB Atlas Free Tier**
- Always online
- Free up to 512MB
- Reliable

### **Production (Large Scale):**
→ **Opsi 2: MongoDB Atlas Paid** or **Opsi 3: Emergent Deploy**
- Professional setup
- Support & SLA
- Scalable

### **Full Control Needed:**
→ **Opsi 4: Self-Hosting**
- Custom configuration
- Security control
- Cost-effective at scale

---

## 🔄 **Migration Workflow:**

### **From Current Dev to MongoDB Atlas:**

```
1. Export Current Data
   ↓
2. Create Atlas Cluster
   ↓
3. Import Data to Atlas
   ↓
4. Update Backend .env
   ↓
5. Test Connection
   ↓
6. Deploy/Restart Backend
   ↓
7. Verify All Features Work
   ↓
8. Database Now Always Accessible!
```

**Time Required:** ~30 minutes

---

## 📝 **Current Export Summary:**

**Latest Backup:**
- **Date:** November 28, 2025 02:16:33 UTC
- **Location:** `/app/database_exports/backup_20251128_021633/`
- **Size:** 24KB (compressed), 184KB (raw)
- **Format:** JSON files per collection

**Collections Exported:**
```
faqs.json         - 8 records    (2.7KB)
locations.json    - 396 records  (78KB)
messages.json     - 49 records   (23KB)
respondents.json  - 148 records  (62KB)
surveys.json      - 5 records    (3.2KB)
users.json        - 14 records   (3.8KB)
```

**Total:** 620 records across 6 collections

---

## 🎯 **Action Items:**

### **Immediate (Today):**
- [x] Export database (DONE!)
- [ ] Download backup ke local machine
- [ ] Review export files

### **Short Term (This Week):**
- [ ] Decide: MongoDB Atlas vs Other option
- [ ] Setup chosen solution
- [ ] Migrate data
- [ ] Test connectivity

### **Long Term:**
- [ ] Setup automated backups
- [ ] Monitor database usage
- [ ] Plan for scaling

---

## 🆘 **Need Help?**

**For MongoDB Atlas:**
- Docs: https://www.mongodb.com/docs/atlas/
- Tutorial: https://www.mongodb.com/docs/atlas/getting-started/

**For Emergent Deployment:**
- Contact support via dashboard
- Check deployment documentation

**For Export/Import:**
- Use `/app/export_database.sh`
- MongoDB docs: https://www.mongodb.com/docs/database-tools/

---

## ✅ **Summary:**

**Current Status:**
- ✅ Database exported & ready to download
- ✅ Backup file: 24KB compressed
- ✅ All data preserved (620 records)

**Next Steps:**
1. Download backup file
2. Choose persistence solution (Atlas recommended)
3. Migrate if needed
4. Enjoy always-accessible database!

**Recommended:** MongoDB Atlas Free Tier
- Setup time: 15 minutes
- Cost: $0
- Result: Always online database

---

**Last Updated:** November 28, 2025  
**Backup Location:** `/app/database_exports/backup_20251128_021633/`
