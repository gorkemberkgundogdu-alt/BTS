# Vercel Deploy GPS Tracking Debug

## ✅ Kontrol Listesi

### 1. Vercel Environment Variables
Vercel Dashboard → Your Project → Settings → Environment Variables

**Gerekli variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://aulbsjlrumyekbuvxghx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_yKSnoPWsuBkGuJXA4v03xA_fv8bvjK8
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1TA9RGQM9xMceIInTtIi4g_c6JJaGto
```

⚠️ **ÖNEMLI:** Variables ekledikten sonra **Redeploy** yapmalısınız!

### 2. Traccar Client Konfigürasyonu

**Server URL format:**
```
https://your-project-name.vercel.app/api/gps
```

**Örnek:**
```
https://belediye-tracking.vercel.app/api/gps
```

⚠️ **Dikkat:**
- `https://` kullanın (http değil!)
- `/api/gps` son kısmı önemli
- Domain doğru mu kontrol edin

**Device Identifier:**
```
test001
```

**Diğer ayarlar:**
- Frequency: 60 seconds
- Distance: 10 meters
- Location Access: Always

### 3. API Endpoint Test

**Browser'dan test edin:**
```
https://your-vercel-url.vercel.app/api/gps?id=test123&lat=41.0082&lon=28.9784&timestamp=1738152000000
```

**Beklenen response:**
```json
{"success":true,"location_id":"uuid","user_mapped":false}
```

**Hata alırsanız:**
- 400: Parametreler eksik
- 500: Supabase connection hatası
- 404: Route bulunamadı (deployment sorunu)

### 4. Vercel Logs Kontrolü

Vercel Dashboard → Your Project → Deployments → Latest → Functions

**Log filtreleme:**
```
/api/gps
```

**Kontrol edilecekler:**
1. Request geliyor mu?
2. Hangi error dönüyor?
3. Supabase connection çalışıyor mu?

### 5. Supabase RLS Policies

Supabase Dashboard → Authentication → Policies → gps_locations

**POST endpoint için INSERT policy gerekli:**
```sql
-- gps_locations için INSERT policy
CREATE POLICY "Allow insert from API"
ON gps_locations
FOR INSERT
WITH CHECK (true);
```

⚠️ **Güvenlik notu:** Production'da bu policy'i daha güvenli hale getirin!

### 6. Migration Kontrolü

Supabase Dashboard → Table Editor → gps_locations

**Gerekli kolonlar var mı:**
- source (VARCHAR)
- device_id (VARCHAR)
- battery_level (NUMERIC)
- traccar_position_id (BIGINT)

**Yoksa migration çalıştırılmamış demektir!**

## 🐛 Yaygın Sorunlar

### Sorun 1: "Failed to fetch" veya "Network Error"
**Sebep:** Traccar Client API'ye ulaşamıyor
**Çözüm:**
- Server URL doğru mu? (https ile başlıyor mu?)
- Vercel domain aktif mi?
- Telefonda internet var mı?

### Sorun 2: 500 Internal Server Error
**Sebep:** Supabase connection hatası
**Çözüm:**
1. Vercel environment variables doğru mu?
2. Redeploy yaptınız mı?
3. Supabase anon key geçerli mi?

### Sorun 3: Veri Supabase'e düşüyor ama user_id null
**Sebep:** Device henüz eşleştirilmemiş
**Çözüm:**
1. `/admin/devices` sayfasına gidin
2. Cihazı personele eşleştirin
3. Sonraki location'lar user_id ile gelecek

### Sorun 4: Request Vercel'e ulaşmıyor
**Sebep:** Traccar Client ayarları yanlış
**Çözüm:**
```
✅ Doğru: https://your-app.vercel.app/api/gps
❌ Yanlış: https://your-app.vercel.app/
❌ Yanlış: http://your-app.vercel.app/api/gps
❌ Yanlış: https://your-app.vercel.app/gps
```

### Sorun 5: Migration çalışmadı
**Belirtiler:**
- "column does not exist" hatası
- gps_locations tablosunda source, device_id kolonları yok

**Çözüm:**
1. Supabase Dashboard → SQL Editor
2. Migration dosyasını yapıştır:
```sql
ALTER TABLE gps_locations 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'browser',
ADD COLUMN IF NOT EXISTS device_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS battery_level NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS traccar_position_id BIGINT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS traccar_device_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_gps_device_id ON gps_locations(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_source ON gps_locations(source);
```
3. Run

## 📱 Test Adımları

### Test 1: API Endpoint
```bash
curl "https://your-app.vercel.app/api/gps?id=curl_test&lat=41.0082&lon=28.9784&timestamp=1738152000000&battery=85"
```

**Beklenen:**
```json
{"success":true,"location_id":"...","user_mapped":false}
```

### Test 2: Supabase'de Kontrol
```sql
SELECT * FROM gps_locations 
WHERE device_id = 'curl_test' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Beklenen:** 1 satır gelsin

### Test 3: Traccar Client Status
- App'i aç
- Status ekranına git
- "Last update" zamanı güncel olmalı
- "Error" olmamalı

### Test 4: Vercel Function Logs
1. Vercel Dashboard → Deployments → Latest
2. Functions tab
3. Filter: `/api/gps`
4. Request log'ları görünüyor mu?

## ✅ Başarı Kriterleri

1. ✅ Vercel deploy başarılı
2. ✅ Environment variables ekli
3. ✅ Migration çalıştırıldı (kolonlar var)
4. ✅ API test isteği 200 dönüyor
5. ✅ Supabase'de veri görünüyor
6. ✅ Traccar Client "Online" ve "Last update" güncel
7. ✅ Vercel logs'da /api/gps request'leri var
8. ✅ `/admin/devices` sayfasında cihaz listeleniyor

## 🆘 Hala Çalışmıyorsa Paylaşın:

1. **Vercel URL:** (your-project.vercel.app)
2. **Traccar Client screenshot:** (Settings + Status ekranı)
3. **API test sonucu:**
```bash
curl "https://YOUR_VERCEL_URL/api/gps?id=debug&lat=41&lon=28&timestamp=1738152000000"
```
4. **Vercel Function Logs:** (Son 5 request)
5. **Supabase RLS policies:** (gps_locations tablosu)
6. **Migration durumu:** (gps_locations kolonları)

Bu bilgilerle tam olarak sorunu bulabiliriz!
