# 🚀 BUILD INSTRUCTIONS - Field Tracker App
## Ready for Production Build with EAS

---

## ✅ **VERIFIED CONFIGURATION**

### **Backend URL:**
```
https://fieldtrack-15.preview.emergentagent.com
```

### **Status:**
- ✅ Environment: **Forked (confirmed)**
- ✅ Backend: **Active and responding**
- ✅ Data: **Available (surveys, FAQs, users)**
- ✅ Configuration: **Verified in eas.json & .env**

---

## 📦 **BUILD PRODUCTION APK**

### **Prerequisites:**
1. ✅ EAS CLI installed: `npm install -g eas-cli`
2. ✅ Expo account logged in: `eas login`
3. ✅ Backend URL configured: `https://fieldtrack-15.preview.emergentagent.com`

---

## 🎯 **LANGKAH BUILD (STEP BY STEP)**

### **Step 1: Clone/Download Project (jika belum)**
```bash
# Jika belum punya project di local
git clone <your-repo-url>
cd project-name/frontend
```

### **Step 2: Install Dependencies**
```bash
cd /path/to/frontend
yarn install
# atau
npm install
```

### **Step 3: Login ke Expo**
```bash
eas login
```
Masukkan:
- Username: `<your-expo-username>`
- Password: `<your-expo-password>`

### **Step 4: Build Production APK**
```bash
cd /path/to/frontend

# Build untuk Android Production
eas build --platform android --profile production
```

### **Proses Build:**
1. ⏱️ EAS akan upload project ke cloud
2. 📦 Build process di Expo servers (5-15 menit)
3. 🔗 Anda akan dapat link download APK
4. 📥 Download APK dari link tersebut

### **Step 5: Install & Test APK**
1. Transfer APK ke Android device
2. Install APK (enable "Install from Unknown Sources")
3. Buka aplikasi
4. Test login dengan credentials:
   ```
   Admin:
   - Email: admin@example.com
   - Password: admin123
   
   Supervisor:
   - Email: supervisor1@example.com
   - Password: super123
   
   Enumerator:
   - Email: enum1@example.com
   - Password: enum123
   ```

---

## 🔄 **PUBLISH OTA UPDATES (Setelah Build)**

### **Setiap Ada Perubahan Code:**

```bash
cd /path/to/frontend

# Publish update
eas update --branch production --message "Your update description"
```

### **Example:**
```bash
# Fix bug
eas update --branch production --message "v1.0.1 - Fixed logout UI spacing"

# Add feature
eas update --branch production --message "v1.0.2 - Added offline sync indicator"

# Multiple fixes
eas update --branch production --message "v1.0.3 - Bug fixes and improvements"
```

---

## 📊 **MONITORING & MANAGEMENT**

### **Check Build Status:**
```bash
eas build:list --platform android
```

### **Check Updates:**
```bash
eas update:list --branch production
```

### **View Specific Update:**
```bash
eas update:view --id <update-id>
```

### **Rollback if Needed:**
```bash
eas update:rollback --branch production
```

---

## 🔐 **BACKEND CONFIGURATION**

### **Current Setup:**

**File: `/app/frontend/.env`**
```env
EXPO_PUBLIC_BACKEND_URL=https://fieldtrack-15.preview.emergentagent.com
```

**File: `/app/frontend/eas.json`**
```json
"production": {
  "developmentClient": false,
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_BACKEND_URL": "https://fieldtrack-15.preview.emergentagent.com"
  }
}
```

### **Backend Endpoints:**
- Base URL: `https://fieldtrack-15.preview.emergentagent.com`
- API Prefix: `/api`
- Example: `https://fieldtrack-15.preview.emergentagent.com/api/auth/login`

---

## ⚠️ **IMPORTANT NOTES**

### **1. Backend URL is PERMANENT**
- URL `https://fieldtrack-15.preview.emergentagent.com` is embedded in APK
- If backend URL changes → **MUST REBUILD APK**
- OTA updates **CANNOT** change backend URL

### **2. Runtime Version**
- Current: Based on SDK version
- All OTA updates must match this runtime version
- If SDK changes → **MUST REBUILD APK**

### **3. Build Once, Update Many Times**
- ✅ Build APK: **Once** (when starting or major changes)
- ✅ OTA Updates: **As many times as needed** (for code changes)

---

## 🎯 **WHAT REQUIRES REBUILD vs OTA**

### **❌ MUST REBUILD APK:**
- Change backend URL
- Update Expo SDK
- Add/remove native dependencies
- Modify app.json permissions
- Add native modules
- Change package name/bundle identifier

### **✅ OTA UPDATE ONLY:**
- Fix UI bugs (logout, keyboard, etc.)
- Update business logic
- Change styling/colors
- Fix JavaScript/TypeScript bugs
- Update API endpoints (same base URL)
- Add/modify screens (React components)

---

## 📱 **APP INFORMATION**

### **App Details:**
- **Name:** Field Tracker
- **Package:** com.fieldtracker.app
- **Version:** 1.0.0
- **Platform:** Android
- **Build Type:** APK (Standalone)

### **Features:**
- ✅ Authentication (JWT)
- ✅ Offline-first architecture
- ✅ Real-time location tracking
- ✅ Survey management
- ✅ AI Chat (Gemini integration)
- ✅ Supervisor messaging
- ✅ Map visualization
- ✅ Auto-sync when online
- ✅ OTA Updates support

---

## 🧪 **TESTING CHECKLIST**

### **Before Distributing APK:**

**Authentication:**
- [ ] Login with all user roles (admin, supervisor, enumerator)
- [ ] Logout functionality works
- [ ] Session persistence after app restart

**Surveys:**
- [ ] View surveys list
- [ ] View survey details
- [ ] Add new respondent
- [ ] Update respondent status

**Map:**
- [ ] View respondents on map
- [ ] Color-coded markers work
- [ ] Location updates show correctly

**Chat:**
- [ ] AI chat works
- [ ] Supervisor messaging works
- [ ] Keyboard doesn't cover input

**Profile:**
- [ ] Location tracking toggle works
- [ ] Sync status shows correctly
- [ ] Check for updates button works
- [ ] Logout with code verification works

**Offline Mode:**
- [ ] App works offline
- [ ] Data queued when offline
- [ ] Auto-sync when back online

---

## 📞 **SUPPORT & RESOURCES**

### **Documentation:**
- EAS Updates Guide: `/app/EAS_UPDATES_GUIDE.md`
- Build Instructions: `/app/BUILD_INSTRUCTIONS.md` (this file)

### **Expo Resources:**
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- EAS Update Docs: https://docs.expo.dev/eas-update/introduction/
- Expo Forum: https://forums.expo.dev/
- EAS Status: https://status.expo.dev/

### **Need Help?**
- Check Expo documentation
- Search Expo forums
- Review error logs: `eas build:list` and `eas update:list`

---

## 🎉 **QUICK START SUMMARY**

```bash
# 1. Login
eas login

# 2. Build APK
cd /path/to/frontend
eas build --platform android --profile production

# 3. Wait for build (5-15 min)
# 4. Download APK
# 5. Install & test on device

# 6. Future updates (as needed)
eas update --branch production --message "Description"
```

---

## ✅ **READY TO BUILD!**

All configurations are verified and ready. You can now:

1. **Build APK** using command above
2. **Install** on Android devices
3. **Test** all features
4. **Distribute** to users
5. **Update** anytime with OTA updates

**Backend URL:** https://fieldtrack-15.preview.emergentagent.com ✅  
**Configuration:** Verified ✅  
**Ready to Build:** YES ✅

---

**Last Updated:** 25 November 2025  
**Environment:** Forked (fieldtrack-15)  
**Status:** Production Ready 🚀
