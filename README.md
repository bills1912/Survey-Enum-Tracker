# Field Data Collection Tracker 📍

A comprehensive device tracking application designed for field data collection with offline-first architecture. Monitor real-time movement of field officers and enumerators, track survey progress, and enable seamless communication even in areas with no network connectivity.

## 🌟 Key Features

- ✅ **Real-Time Location Tracking** (Every 5 minutes in background)
- ✅ **Offline-First Architecture** (Works without internet)
- ✅ **Auto-Sync** (Automatic data synchronization)
- ✅ **Role-Based Access** (Admin/Supervisor/Enumerator)
- ✅ **Interactive Map** with color-coded status markers
- ✅ **Dual Chat System** (AI Assistant + Supervisor)
- ✅ **Survey Management** (Pending → In Progress → Completed)
- ✅ **Real-Time Dashboard** with live statistics

## 🔑 Test Credentials

```
Admin: admin@fieldtracker.com / admin123
Supervisor: supervisor@fieldtracker.com / supervisor123
Enumerator: enum1@fieldtracker.com / enum123
```

## 🏗️ Tech Stack

**Frontend:** Expo/React Native, TypeScript, React Native Maps  
**Backend:** FastAPI, MongoDB, Google Gemini AI  
**Key Features:** Offline-first, JWT Auth, Background Location Tracking

## 🚀 Quick Start

**Seed Database:**
```bash
cd /app/backend && python seed_data.py
```

**Access:**
- Web: https://field-monitor-5.preview.emergentagent.com
- Mobile: Scan QR code with Expo Go app

## 📱 Screens

1. **Login** - Authentication with test credentials
2. **Dashboard** - Statistics and progress tracking
3. **Surveys** - Manage respondents and status
4. **Map** - Visualize locations with color-coded markers
5. **Chat** - AI Assistant + Supervisor messaging
6. **Profile** - Settings and location tracking controls

## 🔄 Offline Capabilities

Works completely offline:
- Complete surveys ✓
- Track GPS location ✓  
- Send messages (queued) ✓
- Update survey status ✓
- Access cached FAQs ✓

Auto-syncs when connection returns!

## 🎯 Survey Status Colors

- 🔴 **Red**: Pending
- 🟡 **Yellow**: In Progress  
- 🟢 **Green**: Completed

##📍 Location Tracking

- Frequency: Every 5 minutes
- Background: Yes (with foreground service)
- Battery Optimized: Yes

## 📄 Documentation

Full API documentation, database schema, and detailed setup instructions available in the README.

---

**Built with Expo, FastAPI & MongoDB**  
Device Tracking for Field Data Collection 🚀
