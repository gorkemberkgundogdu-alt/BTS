'use client'

import { useState, useEffect, useCallback } from 'react'
import { getGPSTrackingService, type LocationData } from '@/lib/services/gps-tracking'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './use-auth'

export function useGPSTracking() {
  const supabase = createClient()
  const { user } = useAuth()
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const trackingService = getGPSTrackingService()

  /**
   * Online/offline durumunu dinle
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setError(null)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setError('İnternet bağlantısı yok. Uçak modunu kapatın.')
      if (isTracking) {
        trackingService.stopTracking()
        setIsTracking(false)
        setCurrentLocation(null)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isTracking, trackingService])

  /**
   * Konum verisini Supabase'e gönder
   */
  const sendLocationToServer = useCallback(async (location: LocationData) => {
    if (!user?.id) return

    try {
      const { error: insertError } = await supabase
        .from('gps_locations')
        .insert([{
          user_id: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          recorded_at: new Date(location.timestamp).toISOString()
        }] as any)

      if (insertError) {
        console.error('GPS veri gönderme hatası:', insertError)
      }
    } catch (err) {
      console.error('GPS veri gönderme hatası:', err)
    }
  }, [user?.id, supabase])

  /**
   * Tracking başlat
   */
  const startTracking = useCallback(async (): Promise<boolean> => {
    // Önce internet kontrolü
    if (!isOnline) {
      setError('İnternet bağlantısı yok. Uçak modunu kapatın veya WiFi açın.')
      return false
    }

    try {
      setError(null)
      
      // İlk önce konum iznini kontrol et
      const hasPermission = await checkPermission()
      if (!hasPermission) {
        setError('Konum izni gerekli. Lütfen tarayıcı ayarlarından izin verin.')
        setPermissionStatus('denied')
        return false
      }

      await trackingService.startTracking(
        (location) => {
          setCurrentLocation(location)
          setError(null) // Clear any previous errors
          // Her konum güncellemesinde server'a gönder
          sendLocationToServer(location)
        },
        (err) => {
          let errorMessage = 'GPS hatası'
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin.'
              setPermissionStatus('denied')
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Konum bilgisi alınamıyor. GPS açık mı kontrol edin.'
              break
            case err.TIMEOUT:
              errorMessage = 'Konum tespiti zaman aşımına uğradı. Tekrar deneyin.'
              break
            default:
              errorMessage = err.message || 'Bilinmeyen GPS hatası'
          }
          
          setError(errorMessage)
          setIsTracking(false)
        }
      )

      setIsTracking(true)
      setPermissionStatus('granted')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GPS başlatılamadı'
      setError(errorMessage)
      setPermissionStatus('denied')
      setIsTracking(false)
      return false
    }
  }, [trackingService, sendLocationToServer, isOnline, checkPermission])

  /**
   * Konum iznini kontrol et
   */
  const checkPermission = async (): Promise<boolean> => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt')
        return result.state !== 'denied'
      }
      return true
    } catch {
      return true // Safari doesn't support permissions API fully
    }
  }

  /**
   * Tracking durdur
   */
  const stopTracking = useCallback(() => {
    trackingService.stopTracking()
    setIsTracking(false)
    setCurrentLocation(null)
  }, [trackingService])

  /**
   * Tek seferlik konum al
   */
  const getCurrentPosition = useCallback(async () => {
    try {
      setError(null)
      const location = await trackingService.getCurrentPosition()
      setCurrentLocation(location)
      return location
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Konum alınamadı'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [trackingService])

  /**
   * Component unmount'ta tracking'i durdur
   */
  useEffect(() => {
    return () => {
      if (isTracking) {
        trackingService.stopTracking()
      }
    }
  }, [isTracking, trackingService])

  return {
    isTracking,
    currentLocation,
    error,
    permissionStatus,
    isOnline,
    startTracking,
    stopTracking,
    getCurrentPosition,
    checkPermission
  }
}
