# 📱 Panduan Implementasi EAS Updates
## Over-The-Air (OTA) Updates untuk Field Tracker App

---

## 📋 **Daftar Isi**
1. [Persiapan Awal](#persiapan-awal)
2. [Konfigurasi EAS Updates](#konfigurasi-eas-updates)
3. [Build Production APK](#build-production-apk)
4. [Cara Publish Updates](#cara-publish-updates)
5. [Testing Updates](#testing-updates)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 **Persiapan Awal**

### 1. Install EAS CLI (di local machine Anda)
```bash
npm install -g eas-cli
```

### 2. Login ke Expo Account
```bash
eas login
```
Masukkan credentials Expo account Anda.

### 3. Configure Project
```bash
cd /app/frontend
eas build:configure
```

---

## ⚙️ **Konfigurasi EAS Updates**

### Konfigurasi Sudah Tersedia:

#### ✅ **app.json** - Updates Configuration
```json
"updates": {
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
},
"runtimeVersion": {
  "policy": "sdkVersion"
}
```

#### ✅ **eas.json** - Build Profiles
File sudah dikonfigurasi dengan 3 profiles:
- `development` - untuk development
- `preview` - untuk internal testing
- `production` - untuk production build

---

## 📦 **Build Production APK**

### Step 1: Build APK Pertama Kali
```bash
cd /app/frontend
eas build --platform android --profile production
```

**Pilihan saat build:**
- Expo akan generate APK di cloud
- Tunggu proses build selesai (5-15 menit)
- Download APK hasil build

### Step 2: Install APK di Device
- Transfer APK ke device Android
- Install APK
- Buka aplikasi dan pastikan berjalan normal

**PENTING:** Ini adalah base build. Semua updates selanjutnya harus compatible dengan runtime version ini!

---

## 🔄 **Cara Publish Updates (OTA)**

### Update Code Anda (Contoh):
1. Ubah file di `/app/frontend/app/(tabs)/`
2. Fix bugs, tambah features, ubah UI, dll.

### Publish Update:
```bash
cd /app/frontend

# Publish ke production channel
eas update --branch production --message "Fix logout UI and chat keyboard"
```

**Opsi Pesan Update:**
```bash
# Dengan pesan deskriptif
eas update --branch production --message "v1.0.1 - Fixed keyboard issues"

# Auto-generated message
eas update --branch production --auto
```

### Check Update Status:
```bash
eas update:list --branch production
```

---

## 🧪 **Testing Updates**

### Di Aplikasi:

**Otomatis (ON_LOAD):**
1. Tutup aplikasi completely (force stop)
2. Buka aplikasi lagi
3. Aplikasi akan check updates otomatis
4. Jika ada update, akan download dan apply saat app restart berikutnya

**Manual Check (Opsional - bisa ditambahkan):**
Tambahkan tombol di Profile screen untuk manual check updates:

```typescript
// Di profile.tsx
import * as Updates from 'expo-updates';

const checkForUpdates = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Update Available',
        'A new update has been downloaded. Restart the app to apply.',
        [
          {
            text: 'Restart Now',
            onPress: () => Updates.reloadAsync()
          }
        ]
      );
    } else {
      Alert.alert('No Updates', 'You are on the latest version!');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to check for updates');
  }
};
```

---

## 📊 **Update Workflow**

### Workflow Normal:
```
1. Develop & Test locally
   ↓
2. Commit changes
   ↓
3. eas update --branch production --message "Description"
   ↓
4. Users open app → Auto download update
   ↓
5. App restart → Update applied
```

### Version Management:
```bash
# Update versi di app.json sebelum publish update penting
{
  "version": "1.0.1"  # Increment version number
}

# Kemudian publish
eas update --branch production --message "v1.0.1 - Major bug fixes"
```

---

## 🎯 **Best Practices**

### 1. **Kapan Harus Rebuild APK?**
Rebuild APK diperlukan jika:
- ❌ Menambah/ubah native dependencies
- ❌ Mengubah app.json config (permissions, plugins)
- ❌ Update Expo SDK version
- ❌ Mengubah package.json dependencies (native modules)

### 2. **Kapan Cukup OTA Update?**
OTA Update cukup untuk:
- ✅ Perubahan JavaScript/TypeScript code
- ✅ Update UI/UX components
- ✅ Fix bugs di business logic
- ✅ Perubahan styling (CSS)
- ✅ Update API calls/endpoints

### 3. **Testing Before Publish:**
```bash
# Test di development dulu
eas update --branch development --message "Testing update"

# Kalau OK, baru publish ke production
eas update --branch production --message "Production update"
```

---

## 🔐 **Channel & Branch Strategy**

### Setup Channels:
```bash
# Development channel
eas update --branch development --message "Dev update"

# Preview channel
eas update --branch preview --message "Preview update"

# Production channel
eas update --branch production --message "Production update"
```

### Link Build ke Channel:
Saat build, specify channel:
```bash
eas build --platform android --profile production
# Otomatis link ke production channel
```

---

## 🛠️ **Troubleshooting**

### Issue 1: Update Tidak Terdeteksi
**Solusi:**
```bash
# Check update list
eas update:list --branch production

# Check build compatibility
eas build:list --platform android
```

### Issue 2: Runtime Version Mismatch
**Solusi:**
- Rebuild APK dengan runtime version yang sama
- Atau update `runtimeVersion` di app.json

### Issue 3: Update Failed to Apply
**Solusi:**
```bash
# Rollback to previous update
eas update:rollback --branch production

# Atau delete update
eas update:delete --id <update-id>
```

### Issue 4: Check Logs
```bash
# View update logs
eas update:view --id <update-id>
```

---

## 📱 **Quick Commands Cheat Sheet**

```bash
# Build Commands
eas build --platform android --profile production        # Build production APK
eas build --platform android --profile preview           # Build preview APK

# Update Commands
eas update --branch production --message "Description"   # Publish OTA update
eas update:list --branch production                      # List all updates
eas update:rollback --branch production                  # Rollback to previous
eas update:delete --id <update-id>                       # Delete specific update

# Status Commands
eas build:list --platform android                        # List all builds
eas update:view --id <update-id>                         # View update details

# Account Commands
eas login                                                # Login to Expo
eas whoami                                               # Check current user
```

---

## 🎉 **Summary untuk Field Tracker App**

### Langkah Cepat:
1. **Build APK pertama kali:**
   ```bash
   cd /app/frontend
   eas build --platform android --profile production
   ```

2. **Install APK di device user**

3. **Setiap ada perubahan code:**
   ```bash
   eas update --branch production --message "Fixed logout UI"
   ```

4. **User buka app → Update otomatis terdownload → Restart app → Update applied!**

---

## 💡 **Tips untuk Field Tracker App**

### Update yang Sering Terjadi:
- ✅ Fix keyboard issues (OTA)
- ✅ Update logout UI (OTA)
- ✅ Perbaikan bug di chat (OTA)
- ✅ Update map markers (OTA)
- ✅ Fix sync issues (OTA)

### Yang Perlu Rebuild:
- ❌ Update expo-location permissions
- ❌ Tambah native modules baru
- ❌ Update Expo SDK
- ❌ Ubah background location config

---

## 📞 **Support**

Jika ada masalah dengan EAS Updates:
- Expo Documentation: https://docs.expo.dev/eas-update/introduction/
- Expo Forum: https://forums.expo.dev/
- EAS Status: https://status.expo.dev/

---

**Dibuat untuk:** Field Tracker App  
**Versi:** 1.0.0  
**Tanggal:** 25 November 2025
