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

  const trackingService = getGPSTrackingService()

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
  const startTracking = useCallback(async () => {
    try {
      setError(null)
      
      await trackingService.startTracking(
        (location) => {
          setCurrentLocation(location)
          // Her konum güncellemesinde server'a gönder
          sendLocationToServer(location)
        },
        (err) => {
          setError(err.message)
          setIsTracking(false)
        }
      )

      setIsTracking(true)
      setPermissionStatus('granted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GPS başlatılamadı')
      setPermissionStatus('denied')
      setIsTracking(false)
    }
  }, [trackingService, sendLocationToServer])

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
    startTracking,
    stopTracking,
    getCurrentPosition
  }
}
