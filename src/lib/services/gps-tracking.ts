/**
 * GPS Tracking Service
 * Background location tracking ve real-time veri gönderimi
 */

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  speed?: number | null
  heading?: number | null
}

export interface TrackingOptions {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  distanceFilter?: number // Minimum hareket mesafesi (metre)
}

export class GPSTrackingService {
  private watchId: number | null = null
  private isTracking = false
  private lastPosition: GeolocationPosition | null = null
  private options: TrackingOptions
  private onLocationUpdate?: (location: LocationData) => void
  private onError?: (error: GeolocationPositionError) => void

  constructor(options: TrackingOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
      distanceFilter: 10, // 10 metre
      ...options
    }
  }

  /**
   * GPS tracking'i başlat
   */
  async startTracking(
    onUpdate: (location: LocationData) => void,
    onError?: (error: GeolocationPositionError) => void
  ): Promise<void> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation desteklenmiyor')
    }

    if (this.isTracking) {
      console.warn('GPS tracking zaten aktif')
      return
    }

    this.onLocationUpdate = onUpdate
    this.onError = onError

    // İlk konum al (izin kontrolü için)
    try {
      await this.getCurrentPosition()
      console.log('✅ GPS izni alındı, tracking başlatılıyor')
    } catch (error) {
      console.error('❌ GPS izni alınamadı:', error)
      throw new Error('Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın.')
    }

    // Tracking başlat
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        maximumAge: this.options.maximumAge,
        timeout: this.options.timeout
      }
    )

    this.isTracking = true
    console.log('GPS tracking başlatıldı')
  }

  /**
   * GPS tracking'i durdur
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.isTracking = false
    this.lastPosition = null
    console.log('GPS tracking durduruldu')
  }

  /**
   * Tek seferlik konum al
   */
  async getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.formatLocationData(position))
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      )
    })
  }

  /**
   * Tracking durumu
   */
  getTrackingStatus(): boolean {
    return this.isTracking
  }

  /**
   * Son konum
   */
  getLastPosition(): LocationData | null {
    return this.lastPosition ? this.formatLocationData(this.lastPosition) : null
  }

  /**
   * Geolocation desteği kontrolü
   */
  private isGeolocationSupported(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Konum izni iste
   */
  private async requestPermission(): Promise<boolean> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        return result.state === 'granted' || result.state === 'prompt'
      }
      return true
    } catch {
      return true
    }
  }

  /**
   * Konum güncellemesi handler
   */
  private handlePositionUpdate(position: GeolocationPosition): void {
    // Distance filter kontrolü
    if (this.lastPosition && this.options.distanceFilter) {
      const distance = this.calculateDistance(
        this.lastPosition.coords.latitude,
        this.lastPosition.coords.longitude,
        position.coords.latitude,
        position.coords.longitude
      )

      if (distance < this.options.distanceFilter) {
        return // Minimum mesafe sağlanmadı, skip
      }
    }

    this.lastPosition = position
    const locationData = this.formatLocationData(position)

    if (this.onLocationUpdate) {
      this.onLocationUpdate(locationData)
    }
  }

  /**
   * Hata handler
   */
  private handleError(error: GeolocationPositionError): void {
    console.error('GPS Tracking Error:', error.message)
    if (this.onError) {
      this.onError(error)
    }
  }

  /**
   * Position'ı LocationData'ya dönüştür
   */
  private formatLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      speed: position.coords.speed,
      heading: position.coords.heading
    }
  }

  /**
   * İki nokta arası mesafe hesapla (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3 // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }
}

// Singleton instance
let trackingService: GPSTrackingService | null = null

export function getGPSTrackingService(): GPSTrackingService {
  if (!trackingService) {
    trackingService = new GPSTrackingService()
  }
  return trackingService
}
