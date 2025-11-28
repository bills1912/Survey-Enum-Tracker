# 📝 Update Log: Survey SE 2026

## ✅ Update Berhasil

**Tanggal:** 2025-01-XX
**Survey:** SE 2026
**ID:** 6923d4adc985b472220ad0f0

---

## 🔄 Perubahan yang Dilakukan

### Field yang Diupdate:

| Field | Nilai Sebelumnya | Nilai Baru |
|-------|------------------|------------|
| `geojson_path` | `null` | `assets/geom/paluta_kec.geojson` |
| `geojson_filter_field` | `null` | `ADM3_EN` |

---

## 📊 Detail Survey SE 2026

```json
{
  "_id": "6923d4adc985b472220ad0f0",
  "title": "SE 2026",
  "description": "For capture the economic condition of households",
  "region_name": "Padang Lawas Utara Regency, Indonesia",
  "region_level": "regency",
  "start_date": "2025-11-24T03:44:45.453000",
  "end_date": "2025-12-24T03:44:45.453000",
  "geojson_path": "assets/geom/paluta_kec.geojson",
  "geojson_filter_field": "ADM3_EN",
  "is_active": true
}
```

---

## ✅ Verifikasi

Data telah berhasil:
- ✅ Disimpan di MongoDB Atlas
- ✅ Diverifikasi melalui API endpoint
- ✅ Diverifikasi melalui script Python
- ✅ Dapat diakses via MongoDB Compass

---

## 🔍 Cara Melihat Data di MongoDB Compass

1. **Buka MongoDB Compass**
2. **Connect** menggunakan connection string
3. **Pilih database:** `field_tracker_db`
4. **Pilih collection:** `surveys`
5. **Filter:** `{ "title": "SE 2026" }`
6. Anda akan melihat field `geojson_path` dan `geojson_filter_field` telah terisi

---

## 🛠️ Script untuk Update Manual (Jika Diperlukan)

Jika Anda ingin update field lain di survey ini:

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

# Update survey
db.surveys.update_one(
    {'_id': ObjectId('6923d4adc985b472220ad0f0')},
    {'\$set': {
        'field_name': 'nilai_baru'
    }}
)

client.close()
"
```

---

## 📱 Dampak pada Aplikasi Mobile

Aplikasi mobile akan otomatis mendapatkan data terbaru saat:
- Fetch survey details
- Load survey list
- Sync data

Tidak ada action khusus yang diperlukan dari user.

---

## 🎯 Next Steps (Optional)

Jika Anda ingin menambahkan file GeoJSON:

1. **Upload file** `paluta_kec.geojson` ke folder `assets/geom/` di aplikasi
2. **Pastikan struktur GeoJSON** memiliki property `ADM3_EN`
3. **Test** filtering berdasarkan field tersebut

---

**Update berhasil dilakukan! ✅**
