# GPS Tracking Debug Rehberi

## ✅ Kontrol Listesi

### 1. Dev Server Çalışıyor mu?
```bash
npm run dev
```
- Beklenen: `✓ Ready in X ms`
- URL: `http://localhost:3000`

### 2. Traccar Client Ayarları

**Device Identifier:**
```
test001
```
(veya herhangi bir benzersiz ID)

**Server URL (dikkat: tam format):**
```
http://192.168.1.XXX:3000/api/gps
```
⚠️ **ÖNEMLİ:**
- `localhost` KULLANMAYIN (telefon bilgisayarı bulamaz)
- Bilgisayarınızın IP adresini kullanın
- Aynı WiFi ağında olun

**IP Adresinizi öğrenmek için:**
```bash
# Windows
ipconfig
# "Wireless LAN adapter WiFi" altındaki "IPv4 Address" değeri
```

**Frequency:** 60 seconds
**Distance:** 10 meters
**Location Access:** Always

### 3. API Test (Manuel)

**Browser'dan test:**
```
http://localhost:3000/api/gps?id=test123&lat=41.0082&lon=28.9784&timestamp=1738152000000
```

**Beklenen response:**
```json
{
  "success": true,
  "location_id": "uuid-burada",
  "user_mapped": false
}
```

**cURL ile test:**
```bash
curl "http://localhost:3000/api/gps?id=test123&lat=41.0082&lon=28.9784&timestamp=$(date +%s)000&battery=85&speed=10"
```

### 4. Supabase Table Kontrolü

1. https://supabase.com/dashboard açın
2. Projenizi seçin
3. Table Editor → `gps_locations`
4. En son kaydı kontrol edin

**SQL ile kontrol:**
```sql
SELECT * FROM gps_locations 
ORDER BY created_at DESC 
LIMIT 10;
```

### 5. Browser Console Logs

1. `http://localhost:3000/admin/devices` açın
2. F12 → Console
3. Traccar Client'tan konum gönderin
4. Console'da hata var mı kontrol edin

**Network tab kontrolü:**
1. F12 → Network
2. Filter: `/api/gps`
3. Request geldi mi?
4. Response kodu: 200 mi?

### 6. Traccar Client Debug

**Android:**
- Settings → Developer options
- USB debugging açık olsun
- `adb logcat | grep Traccar` ile log'ları izleyin

**iOS:**
- Console.app (macOS)
- iPhone bağlı
- Traccar filtresi

**App içi log:**
- Traccar Client → ⋮ (üç nokta) → Status
- "Last update" zamanı güncel mi?
- "Error" mesajı var mı?

## 🐛 Yaygın Sorunlar

### Sorun: "Connection failed"
**Çözüm:**
- Server URL'de IP adresinizi kullanın
- `http://` ekleyin (https DEĞİL)
- Port numarasını kontrol edin (`:3000`)

### Sorun: "Network request failed"
**Çözüm:**
- Telefon ve bilgisayar aynı WiFi'da mı?
- Firewall Next.js'i engelliyor mu?
- `npm run dev` çalışıyor mu?

### Sorun: Veri Supabase'e düşmüyor
**Çözüm:**
```bash
# 1. API endpoint çalışıyor mu test et
curl http://localhost:3000/api/gps?id=test&lat=41&lon=28&timestamp=1738152000000

# 2. Supabase credentials doğru mu kontrol et
cat .env.local

# 3. Migration çalıştı mı kontrol et
# Supabase Dashboard → Table Editor → gps_locations
# Kolonlar: source, device_id, battery_level var mı?
```

### Sorun: user_mapped: false
**Çözüm:**
1. `/admin/devices` sayfasına git
2. Cihazı personele eşleştir
3. Kaydet butonuna bas

## 📱 Traccar Client Test Komutu

Traccar Client kullanmadan API'yi test edin:

```bash
# Windows PowerShell
$timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
Invoke-WebRequest -Uri "http://localhost:3000/api/gps?id=test001&lat=41.0082&lon=28.9784&timestamp=$timestamp&battery=85&speed=5&accuracy=10"

# CMD
curl "http://localhost:3000/api/gps?id=test001&lat=41.0082&lon=28.9784&timestamp=%date:~-4%%date:~3,2%%date:~0,2%%time:~0,2%%time:~3,2%%time:~6,2%000&battery=85"
```

## ✅ Başarı Kriterleri

1. ✅ `npm run dev` çalışıyor
2. ✅ `http://localhost:3000` açılıyor
3. ✅ API test isteği 200 dönüyor
4. ✅ Supabase'de kayıt görünüyor
5. ✅ Traccar Client "Online" durumda
6. ✅ `/admin/devices` sayfasında cihaz listeleniyor
7. ✅ Cihaz eşleştirildikten sonra `/admin/routes` haritada görünüyor

## 🆘 Hala Çalışmıyorsa

1. **Terminal output paylaşın:**
   - `npm run dev` çıktısı
   
2. **Browser console paylaşın:**
   - F12 → Console → Hata mesajları
   
3. **Traccar Client screenshot:**
   - Settings ekranı
   - Status ekranı

4. **Supabase log:**
   - Dashboard → Logs → API
   - Son 10 request

5. **Test API response:**
```bash
curl -v "http://localhost:3000/api/gps?id=debug&lat=41&lon=28&timestamp=1738152000000"
```
Çıktıyı tam olarak paylaşın.
