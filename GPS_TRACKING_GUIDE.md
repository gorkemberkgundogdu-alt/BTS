# GPS Tracking Sistemi - Kullanım Kılavuzu

## 📱 Genel Bakış

BTS GPS Tracking sistemi, Traccar Client mobil uygulaması kullanarak personelin gerçek zamanlı konumunu takip eder. Traccar Server kullanılmaz, sadece Traccar Client → BTS API → Supabase → MapLibre akışı vardır.

## 🏗️ Mimari

```
Traccar Client (Mobile App)
    ↓ POST /api/gps?id=DEVICE_ID&lat=X&lon=Y...
Next.js API Route (/api/gps)
    ↓ Insert
Supabase (gps_locations table)
    ↓ Realtime Subscription
MapLibre Map (LiveTrackingMap component)
```

## 🗄️ Database Yapısı

### `gps_locations` Tablosu

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Kullanıcı ID (profiles tablosuna referans) |
| `device_id` | VARCHAR | Cihaz ID (Traccar Client'tan gelen) |
| `latitude` | NUMERIC(10,7) | Enlem |
| `longitude` | NUMERIC(10,7) | Boylam |
| `accuracy` | NUMERIC(6,2) | Hassasiyet (metre) |
| `speed` | NUMERIC(5,2) | Hız (m/s) |
| `heading` | NUMERIC(5,2) | Yön (derece, 0-360) |
| `altitude` | NUMERIC(7,2) | Yükseklik (metre) |
| `battery_level` | NUMERIC(5,2) | Batarya seviyesi (0-100) |
| `source` | VARCHAR(20) | Kaynak: 'browser', 'traccar', 'hardware' |
| `traccar_position_id` | BIGINT | Traccar position ID (deduplication) |
| `recorded_at` | TIMESTAMPTZ | Konum kaydedilme zamanı |
| `created_at` | TIMESTAMPTZ | Database insert zamanı |

### `profiles` Tablosu (Eklenen Alan)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `traccar_device_id` | VARCHAR | Eşleştirilmiş cihaz ID |

## 📲 Traccar Client Kurulumu

### 1. Uygulama İndirme

**Android:**
- Google Play Store: [Traccar Client](https://play.google.com/store/apps/details?id=org.traccar.client)

**iOS:**
- App Store: [Traccar Client](https://apps.apple.com/app/traccar-client/id843156974)

### 2. Uygulama Yapılandırması

Traccar Client'ı açın ve aşağıdaki ayarları yapın:

#### Device Settings
- **Device Identifier**: Benzersiz bir ID girin (örn: `worker001`, telefon IMEI, personel numarası)
  - Bu ID ile cihaz-kullanıcı eşleştirmesi yapılacak

#### Connection Settings
- **Server URL**: `https://yourdomain.com/api/gps`
  - Localhost test için: `http://YOUR_LOCAL_IP:3000/api/gps`
  - ngrok kullanıyorsanız: `https://your-ngrok-url.ngrok.io/api/gps`

#### Location Settings
- **Frequency**: `60` saniye (önerilir)
  - Daha sık güncellemeler için düşürün (min: 10)
  - Batarya tasarrufu için artırın (max: 300)
- **Distance**: `10` metre
  - Minimum hareket mesafesi
- **Angle**: `30` derece (opsiyonel)
  - Yön değişikliği threshold

#### Advanced Settings
- **Wake Lock**: ✅ Aktif
  - Uygulamanın arka planda çalışmasını sağlar
- **Battery Optimization**: Devre dışı bırakın (Android ayarlarından)
  - Settings → Apps → Traccar Client → Battery → Unrestricted

### 3. İzinler

Aşağıdaki izinleri verin:
- ✅ Location (Always / All the time)
- ✅ Battery optimization exception
- ✅ Run in background
- ✅ Physical activity (Android 10+)

### 4. Test

1. Traccar Client'ta **Start** düğmesine basın
2. Status: "Online" görünmeli
3. Son konum zamanı güncellenmeli
4. BTS Admin panelinde "Cihaz Yönetimi" sayfasına gidin
5. Cihazınız listede görünmeli

## 🖥️ Admin Panel Kullanımı

### Cihaz Eşleştirme (`/admin/devices`)

1. **Eşleştirilmemiş Cihazlar** bölümünde yeni cihazları görün
2. Cihaz için açılır menüden personel seçin
3. **Eşleştirmeyi Kaydet** düğmesine basın
4. Artık bu cihazdan gelen konumlar otomatik olarak o personele atanacak

### Canlı Takip Haritası (`/admin/routes`)

- **Harita görünümü**: Tüm aktif personel gerçek zamanlı gösterilir
- **Marker renkleri**:
  - 🔵 Mavi: Hareket halinde (hız > 0.5 m/s)
  - ⚫ Gri: Durgun
- **Animasyonlar**:
  - Hareket halindeki personelde "ping" animasyonu
  - Batarya < %20 ise kırmızı uyarı badge
- **Popup bilgileri**:
  - İsim, rol
  - Son güncelleme zamanı
  - Hız (km/h)
  - Batarya seviyesi
  - Hassasiyet
- **Rota çizgisi**: Son 1 saatlik hareket rotası (mavi çizgi)
- **Filtreleme**:
  - Tümü
  - Aktif (son 10 dk içinde güncellenen)
  - Pasif

### Personel Detay Sayfası (`/admin/personnel/[id]`)

- Tekil personel takibi
- Son 100 konum kaydı
- Rota çizgisi (son 50 konum)
- Konum istatistikleri

## 🔌 API Endpoints

### POST /api/gps

Traccar Client'tan konum verisi alır.

**Query Parameters:**
```
?id=device_id          (required) - Device unique ID
&lat=41.0082          (required) - Latitude
&lon=28.9784          (required) - Longitude
&timestamp=1706529000 (required) - Unix timestamp (ms)
&speed=45.5           (optional) - Speed (m/s)
&bearing=180          (optional) - Heading (degrees)
&altitude=100         (optional) - Altitude (meters)
&accuracy=10          (optional) - Accuracy (meters)
&battery=85.5         (optional) - Battery level (0-100)
```

**Response:**
```json
{
  "success": true,
  "location_id": "uuid",
  "user_mapped": true
}
```

### GET /api/gps

Konum verilerini getirir (authenticated).

**Query Parameters:**
```
?user_id=uuid         (optional) - Filter by user
&limit=100           (optional) - Number of records
&since=2024-01-29    (optional) - Timestamp filter
```

**Response:**
```json
{
  "locations": [...],
  "count": 10
}
```

## 🎨 UI Components

### MapContainer
Temel harita container, detaylı OSM dark theme stili ile.

```tsx
import { MapContainer } from '@/components/maps/map-container'

<MapContainer
  center={[35.2433, 38.9637]}
  zoom={12}
  className="h-full"
  onLoad={(map) => console.log('Map loaded')}
/>
```

### LiveTrackingMap
Multi-personnel gerçek zamanlı takip haritası.

```tsx
import { LiveTrackingMap } from '@/components/maps/live-tracking-map'

<LiveTrackingMap
  center={[35.2433, 38.9637]}
  zoom={12}
  showTrails={true}
  onPersonnelClick={(userId) => router.push(`/admin/personnel/${userId}`)}
/>
```

## 🔄 Realtime Subscriptions

Supabase Realtime ile canlı güncellemeler:

```typescript
const channel = supabase
  .channel('live-gps-tracking')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'gps_locations'
    },
    (payload) => {
      // Yeni konum geldi, haritayı güncelle
    }
  )
  .subscribe()
```

## 🔐 Güvenlik

### RLS (Row Level Security)

- Workers: Sadece kendi konumlarını görebilir
- Admins/Supervisors: Kendi belediyesindeki tüm konumları görebilir
- Super Admin: Tüm konumları görebilir

### API Güvenliği

- POST /api/gps: Public endpoint (Traccar Client için)
- GET /api/gps: Authenticated endpoint
- Device ID doğrulama
- Municipality isolation

## 📊 Performans

### Database İndeksler

```sql
idx_gps_device_id ON gps_locations(device_id, recorded_at DESC)
idx_gps_source ON gps_locations(source)
idx_gps_user_time ON gps_locations(user_id, recorded_at DESC)
idx_profiles_traccar_device ON profiles(traccar_device_id)
```

### Optimizasyon İpuçları

1. **Eski veri temizliği**: >6 ay önceki verileri arşivleyin
2. **Clustering**: MapLibre'da >50 marker için clustering ekleyin
3. **Debouncing**: Realtime updates'i 5 saniyede batch'leyin
4. **Trail limit**: Rota çizgisi için max 100 nokta

## 🐛 Sorun Giderme

### Konum gönderilmiyor

1. Traccar Client "Online" durumda mı?
2. Server URL doğru mu?
3. Device ID girildi mi?
4. Location izinleri verildi mi (Always)?
5. Battery optimization kapalı mı?
6. Network bağlantısı var mı?

### Haritada görünmüyor

1. Cihaz eşleştirildi mi? (`/admin/devices`)
2. Son 10 dakikada konum güncellemesi var mı?
3. RLS politikaları doğru mu?
4. Browser console'da hata var mı?

### Batarya tüketimi fazla

1. Frequency'yi artırın (60s → 120s)
2. Distance filter'ı artırın (10m → 50m)
3. Wake Lock'u kapatın (sadece aktif görevlerde açın)

## 🚀 Deployment

### Migration Çalıştırma

```bash
# Supabase CLI ile
supabase db push

# Veya SQL dosyasını manuel çalıştırın
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/00013_add_traccar_integration.sql
```

### Traccar Client Yapılandırma (Toplu)

QR kod ile yapılandırma JSON'u:

```json
{
  "id": "worker001",
  "url": "https://yourdomain.com/api/gps",
  "interval": 60,
  "distance": 10,
  "accuracy": "high"
}
```

## 📝 Notlar

- Traccar **Server** kullanılmıyor, sadece Traccar **Client** mobil uygulaması
- GPS verileri doğrudan BTS API'sine POST ediliyor
- Supabase primary database olarak kullanılıyor
- Realtime updates Supabase Realtime ile yapılıyor
- MapLibre GL JS ile detaylı harita görselleştirmesi

## 🆘 Destek

Sorunlarınız için:
1. Browser console loglarını kontrol edin
2. Supabase logs'larını inceleyin (`Dashboard → Logs → API`)
3. Traccar Client log'larını kontrol edin (Settings → Log)
4. Network tab'ı ile API isteklerini izleyin
