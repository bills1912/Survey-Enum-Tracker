# 🚀 Panduan Setup MongoDB Atlas

Panduan lengkap untuk menghubungkan aplikasi Field Tracker ke MongoDB Atlas.

---

## 📋 Informasi Koneksi Anda

- **Cluster:** cluster0.lhmox.mongodb.net
- **Username:** ricardozalukhu1925
- **Database:** field_tracker_db
- **IP Address Anda:** 182.9.35.117

---

## 🔐 Step 1: Whitelist IP Address di MongoDB Atlas

### Langkah-langkah:

1. **Login ke MongoDB Atlas**
   - Buka https://cloud.mongodb.com/
   - Login dengan kredensial Anda

2. **Buka Network Access**
   - Di sidebar kiri, klik **"Network Access"**
   - Atau dari menu **"Security" → "Network Access"**

3. **Tambah IP Address**
   - Klik tombol **"+ ADD IP ADDRESS"** (warna hijau)
   
4. **Pilih salah satu opsi:**

   **OPSI A - Whitelist IP Spesifik (Lebih Aman):**
   - Pilih **"Add Current IP Address"** jika Anda sedang di komputer yang sama
   - ATAU masukkan manual: `182.9.35.117`
   - Klik **"Confirm"**

   **OPSI B - Allow Access From Anywhere (Development Only):**
   - Klik **"ALLOW ACCESS FROM ANYWHERE"**
   - Ini akan add IP: `0.0.0.0/0`
   - ⚠️ **PERINGATAN:** Hanya gunakan untuk development/testing
   - Untuk production, gunakan opsi A dengan IP spesifik

5. **Tambah IP Server Emergent (Untuk Backend)**
   - Backend aplikasi jalan di server Emergent yang perlu akses database
   - Solusi termudah: gunakan **"ALLOW ACCESS FROM ANYWHERE"** (0.0.0.0/0)
   - Alternatif: Tanya support Emergent untuk IP range mereka

6. **Tunggu Hingga Active**
   - Status akan berubah dari "Pending" ke "Active"
   - Biasanya memakan waktu 1-2 menit

---

## 💻 Step 2: Setup MongoDB Compass (Akses dari Komputer Lokal)

### Download MongoDB Compass:
- Download di: https://www.mongodb.com/try/download/compass
- Install dan buka aplikasi

### Connection String untuk Compass:

```
mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/field_tracker_db?retryWrites=true&w=majority&appName=Cluster0
```

### Cara Connect:

1. **Buka MongoDB Compass**
2. Di halaman "New Connection", paste connection string di atas
3. Klik **"Connect"**
4. Jika berhasil, Anda akan melihat database `field_tracker_db` dan collections nya

### Troubleshooting Compass:

❌ **Error: "connection timed out"**
- ✅ Pastikan IP address sudah di-whitelist di Network Access
- ✅ Cek status di Atlas - pastikan "Active" bukan "Pending"
- ✅ Tunggu 2-3 menit setelah whitelist baru ditambahkan

❌ **Error: "authentication failed"**
- ✅ Cek username/password di connection string
- ✅ Pastikan user sudah dibuat di Atlas → Security → Database Access

---

## 🔧 Step 3: Backend Configuration (Sudah Saya Update)

File `/app/backend/.env` sudah saya update dengan connection string yang benar:

```env
MONGO_URL="mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/field_tracker_db?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME="field_tracker_db"
```

---

## ✅ Step 4: Test Koneksi

### Test dari Backend (Server Emergent):

```bash
cd /app/backend
python test_mongodb_connection.py
```

**Output yang diharapkan:**
```
✅ Successfully connected to MongoDB Atlas!
📊 Database: field_tracker_db
📁 Collections: users, surveys, respondents, locations, messages, faqs
```

### Test API Endpoint:

Setelah backend restart, test API:

```bash
curl http://localhost:8001/api/
```

**Output yang diharapkan:**
```json
{"message":"Field Data Collection API","status":"online"}
```

---

## 🌐 Step 5: Akses Database Viewer (Web Interface)

Setelah backend terkoneksi, akses database viewer via browser:

```
http://localhost:8001/database-viewer
```

Atau jika ada URL preview Emergent, ganti localhost dengan URL tersebut.

---

## 🔒 Security Best Practices

### Untuk Production:

1. **Jangan gunakan "Allow Access from Anywhere"**
   - Whitelist hanya IP yang benar-benar dibutuhkan

2. **Ganti Password Database User**
   - Di Atlas → Security → Database Access
   - Edit user dan ubah password
   - Update connection string di `.env`

3. **Gunakan Environment Variables**
   - Jangan commit file `.env` ke Git
   - Pastikan `.env` ada di `.gitignore`

4. **Enable Audit Log (Atlas Premium)**
   - Monitor semua database access

---

## 🆘 Troubleshooting Umum

### Problem: Backend tidak bisa connect ke Atlas

**Solusi:**
1. Cek apakah IP range 0.0.0.0/0 sudah di-whitelist (untuk development)
2. Cek MONGO_URL di `/app/backend/.env` sudah benar
3. Restart backend: `sudo supervisorctl restart backend`
4. Cek logs: `sudo supervisorctl tail -f backend`

### Problem: Compass tidak bisa connect

**Solusi:**
1. Pastikan IP address komputer Anda (182.9.35.117) sudah di-whitelist
2. Jika menggunakan VPN/Proxy, IP mungkin berubah - cek di https://whatismyipaddress.com/
3. Tunggu 2-3 menit setelah whitelist ditambahkan
4. Try "Allow Access from Anywhere" untuk testing

### Problem: Data tidak muncul di database viewer

**Solusi:**
1. Pastikan backend sudah restart dan running
2. Cek collection names di MongoDB Compass - pastikan sama dengan yang di code
3. Test koneksi dengan script: `python test_mongodb_connection.py`

---

## 📞 Bantuan Lebih Lanjut

Jika masih ada masalah:

1. **Cek MongoDB Atlas Status Page:** https://status.mongodb.com/
2. **Screenshot error message** dan share ke saya
3. **Cek logs backend:** `sudo supervisorctl tail -f backend stderr`
4. **Test koneksi dengan script test** yang sudah disediakan

---

## ✨ Setelah Berhasil Connect

Anda bisa:

1. ✅ Lihat semua data di MongoDB Compass
2. ✅ Edit/hapus documents langsung dari Compass
3. ✅ Run queries di Compass untuk analisis data
4. ✅ Export data ke JSON/CSV dari Compass
5. ✅ Akses database viewer via web browser
6. ✅ Gunakan script `db_manipulate.py` untuk operasi database

---

**🎉 Selamat! Database Anda sekarang terhubung ke MongoDB Atlas!**
