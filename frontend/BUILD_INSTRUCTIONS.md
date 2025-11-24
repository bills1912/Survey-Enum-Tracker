# 🚀 Panduan Build APK Development Client

## Langkah 1: Persiapan (Di Komputer/Terminal Anda)

### Install EAS CLI
```bash
npm install -g eas-cli
```

### Verifikasi Instalasi
```bash
eas --version
```

## Langkah 2: Login ke Expo

### Jika Belum Punya Account:
1. Buka: https://expo.dev
2. Sign up (gratis)
3. Catat email dan password

### Login via CLI:
```bash
eas login
```
Masukkan email dan password Expo account Anda

## Langkah 3: Configure Project (SUDAH DILAKUKAN)

✅ eas.json sudah dibuat
✅ expo-dev-client sudah terinstall
✅ app.json sudah dikonfigurasi

## Langkah 4: Build APK

### Masuk ke folder frontend:
```bash
cd /app/frontend
```

### Jalankan Build:
```bash
eas build --profile development --platform android
```

### Yang Akan Terjadi:
1. EAS akan bertanya: "Would you like to create a new project?" → Ketik **y** (yes)
2. EAS akan upload project ke cloud
3. Build akan dimulai (durasi: 15-20 menit)
4. Anda akan mendapat link untuk download APK

### Alternatif: Build Locally (Lebih Cepat, Tapi Butuh Android Studio)
```bash
eas build --profile development --platform android --local
```

## Langkah 5: Install APK

### Setelah Build Selesai:
1. **Download APK** dari link yang diberikan EAS
2. **Transfer APK ke HP Android** Anda
3. **Install APK** (enable "Install from Unknown Sources" jika diminta)
4. **Buka aplikasi** - akan otomatis connect ke backend

## Langkah 6: Testing

### Login Credentials:
```
Email: enum1@example.com
Password: enum123
```

### Backend URL (sudah dikonfigurasi di .env):
```
https://datacollect-2.preview.emergentagent.com/api
```

## 🔥 Quick Commands

### Build Development APK:
```bash
eas build -p android --profile development
```

### Check Build Status:
```bash
eas build:list
```

### View Build Logs:
```bash
eas build:view [BUILD_ID]
```

## 🆘 Troubleshooting

### Error: "Not logged in"
```bash
eas logout
eas login
```

### Error: "Project not configured"
```bash
eas build:configure
```

### Error: "Build failed"
- Check build logs dengan: `eas build:view [BUILD_ID]`
- Periksa apakah semua packages terinstall dengan benar

## 📱 Setelah APK Terinstall

### Cara Kerja Development Client:
1. APK yang diinstall adalah **development client**
2. Aplikasi akan otomatis connect ke backend
3. Tidak perlu Expo Go lagi
4. Full native features tersedia (GPS, background location, dll)

## ⏱️ Estimasi Waktu

- Setup EAS CLI: 5 menit
- Login & Config: 2 menit
- Build di Cloud: 15-20 menit
- Download & Install: 5 menit

**Total: ~30 menit**

## 📋 Checklist

- [ ] Install EAS CLI
- [ ] Login ke Expo account
- [ ] Run `eas build -p android --profile development`
- [ ] Wait for build to complete
- [ ] Download APK
- [ ] Install di HP
- [ ] Test login dan semua fitur

## 🎯 Keuntungan Development Client vs Expo Go

✅ Tidak ada masalah tunnel/ngrok
✅ Full native features
✅ Lebih stabil
✅ Install seperti app normal
✅ Bisa distributed ke team
✅ Automatic updates support

## 🔗 Resources

- EAS Build Docs: https://docs.expo.dev/build/setup/
- Expo Dev Client: https://docs.expo.dev/develop/development-builds/introduction/
- Troubleshooting: https://docs.expo.dev/build-reference/troubleshooting/

---

**Need Help?** 
Screenshot any error dan kirim ke chat!
