# GPS Debug - Adım Adım Test

## 🔍 Şu anda ne çalışmıyor?

Lütfen aşağıdaki soruları cevaplayın:

### 1. Traccar Client Durumu
- [ ] Traccar Client kuruldu mu?
- [ ] "Start" butonuna basıldı mı?
- [ ] Status ekranında ne yazıyor?
  - Online mi?
  - Last update zamanı var mı?
  - Error mesajı var mı?

### 2. Server URL
Traccar Client'ta Server URL ne olarak ayarlı?
```
Şu an ne: _____________________
Olması gereken: https://your-vercel-url.vercel.app/api/gps
```

### 3. Vercel Deploy
- [ ] Son commit push edildi mi?
- [ ] Vercel deploy tamamlandı mı?
- [ ] Environment variables ekli mi?

### 4. Test Sonuçları

**Browser'dan test:**
```
https://your-vercel-url.vercel.app/api/gps?id=test&lat=41&lon=28&timestamp=1738152000000
```

Ne döndü:
- [ ] 200 OK - {"success":true,...}
- [ ] 400 Bad Request
- [ ] 500 Server Error
- [ ] 404 Not Found
- [ ] Başka: _____________

### 5. Vercel Logs
Vercel Dashboard → Functions → Logs

Logs'da ne görünüyor:
- [ ] Hiç request gelmiyor
- [ ] Request geliyor ama hata veriyor
- [ ] Console.log'lar görünüyor
- [ ] Başka: _____________

### 6. Supabase
Table Editor → gps_locations

- [ ] Tablo var
- [ ] Kolonlar var (source, device_id, battery_level)
- [ ] Hiç veri yok
- [ ] Veri var ama user_id null

---

## 🧪 Hızlı Test - Şimdi Yapın

### Test 1: Vercel URL'i Doğrula
Vercel Dashboard'dan projenizin URL'ini kopyalayın ve buraya yapıştırın:
```
URL: https://_________________.vercel.app
```

### Test 2: Browser'dan İstek
Bu URL'i tarayıcıda açın (URL'i kendi domain'inizle değiştirin):
```
https://YOUR_DOMAIN.vercel.app/api/gps?id=browsertest&lat=41.0082&lon=28.9784&timestamp=1738152000000&batt=99
```

Ekran çıktısı:
```json
(buraya yapıştırın)
```

### Test 3: Supabase'de Kontrol
1. Supabase Dashboard → Table Editor
2. gps_locations tablosunu aç
3. Filter: device_id = 'browsertest'
4. Kaç satır var? _______

### Test 4: Traccar Client Screenshot
Settings ekranının screenshot'unu alın:
- Server URL
- Device Identifier
- Status (Online/Offline)

---

## 🔧 En Olası Sorunlar ve Çözümleri

### Sorun A: "Vercel'e request gelmiyor"
**Belirti:** Vercel logs boş, hiç request yok
**Sebep:** Traccar Client yanlış URL'e istek gönderiyor
**Çözüm:**
1. Traccar Client → Settings → Server URL
2. TAM URL yazın: `https://your-app.vercel.app/api/gps`
3. HTTP değil HTTPS!
4. Sonunda /api/gps olmalı

### Sorun B: "Request geliyor ama 500 error"
**Belirti:** Vercel logs'da hata görünüyor
**Sebep:** Environment variables eksik
**Çözüm:**
1. Vercel → Settings → Environment Variables
2. 3 variable ekle (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
3. Redeploy yap

### Sorun C: "Supabase'e veri düşmüyor"
**Belirti:** Request 200 dönüyor ama tablo boş
**Sebep:** RLS policy veya migration eksik
**Çözüm:**
1. Migration 00014'ü çalıştır (RLS fix)
2. Supabase logs kontrol et
3. RLS policy var mı bak

### Sorun D: "Traccar Client hata veriyor"
**Belirti:** Status: Error, Connection failed
**Sebep:** URL yanlış veya network sorunu
**Çözüm:**
1. URL'de typo var mı?
2. Internet bağlantısı var mı?
3. Firewall engelliyor mu?

---

## 📞 Bana Hangi Bilgileri Verin

Sorunu çözmem için şunları paylaşın:

1. **Vercel URL'iniz:**
   ```
   https://________________
   ```

2. **Browser test sonucu:**
   ```json
   (response buraya)
   ```

3. **Traccar Client Settings screenshot veya:**
   ```
   Server URL: _____________
   Device ID: _____________
   Status: _____________
   ```

4. **Vercel Function Logs:**
   ```
   (son 5-10 satır log)
   ```

5. **Supabase gps_locations tablo durumu:**
   ```
   Row count: _____
   En son kayıt var mı: Evet/Hayır
   ```

Bu bilgilerle tam olarak neyin yanlış olduğunu bulup düzeltebilirim!
