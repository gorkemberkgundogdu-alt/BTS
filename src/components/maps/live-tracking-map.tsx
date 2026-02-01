'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface PersonnelLocation {
  id: string
  user_id: string
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  battery_level: number | null
  recorded_at: string
  source: string
  profiles: {
    id: string
    full_name: string
    role: string
    avatar_url?: string
  }
}

interface LiveTrackingMapProps {
  className?: string
  center?: [number, number] // [lng, lat]
  zoom?: number
  municipalityId?: string
  showTrails?: boolean
  onPersonnelClick?: (personnelId: string) => void
}

export function LiveTrackingMap({
  className,
  center = [35.2433, 38.9637],
  zoom = 12,
  municipalityId,
  showTrails = true,
  onPersonnelClick
}: LiveTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map())
  const [isLoaded, setIsLoaded] = useState(false)
  const [personnelLocations, setPersonnelLocations] = useState<Map<string, PersonnelLocation>>(new Map())
  const supabase = createClient()

  // Create custom marker element
  const createMarkerElement = useCallback((personnel: PersonnelLocation) => {
    const el = document.createElement('div')
    el.className = 'personnel-marker'
    
    const isMoving = personnel.speed && personnel.speed > 0.5 // > 0.5 m/s
    const batteryLow = personnel.battery_level && personnel.battery_level < 20
    
    el.innerHTML = `
      <div class="relative cursor-pointer">
        ${isMoving ? '<div class="absolute -inset-1 bg-blue-500 rounded-full animate-ping opacity-75"></div>' : ''}
        <div class="relative w-12 h-12 ${isMoving ? 'bg-blue-600' : 'bg-slate-600'} rounded-full border-4 border-white shadow-lg flex items-center justify-center">
          ${personnel.profiles.avatar_url 
            ? `<img src="${personnel.profiles.avatar_url}" alt="${personnel.profiles.full_name}" class="w-full h-full rounded-full object-cover" />`
            : `<span class="text-white text-sm font-bold">${personnel.profiles.full_name.charAt(0)}</span>`
          }
        </div>
        ${batteryLow ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>' : ''}
      </div>
    `
    
    el.addEventListener('click', () => {
      if (onPersonnelClick) {
        onPersonnelClick(personnel.user_id)
      }
    })
    
    return el
  }, [onPersonnelClick])

  // Create popup content
  const createPopupContent = useCallback((personnel: PersonnelLocation) => {
    const lastUpdate = new Date(personnel.recorded_at)
    const now = new Date()
    const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000)
    
    return `
      <div class="p-2 min-w-[200px]">
        <div class="flex items-center gap-2 mb-2">
          <div class="font-bold text-slate-900">${personnel.profiles.full_name}</div>
          <span class="text-xs px-2 py-0.5 rounded-full ${personnel.source === 'traccar' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">${personnel.source}</span>
        </div>
        <div class="text-xs text-slate-600 space-y-1">
          <div class="flex items-center justify-between">
            <span>Son güncelleme:</span>
            <span class="font-medium">${minutesAgo === 0 ? 'Şimdi' : `${minutesAgo} dk önce`}</span>
          </div>
          ${personnel.speed !== null ? `
            <div class="flex items-center justify-between">
              <span>Hız:</span>
              <span class="font-medium">${Math.round(personnel.speed * 3.6)} km/h</span>
            </div>
          ` : ''}
          ${personnel.battery_level !== null ? `
            <div class="flex items-center justify-between">
              <span>Batarya:</span>
              <span class="font-medium ${personnel.battery_level < 20 ? 'text-red-600' : ''}">${Math.round(personnel.battery_level)}%</span>
            </div>
          ` : ''}
          <div class="flex items-center justify-between">
            <span>Hassasiyet:</span>
            <span class="font-medium">${Math.round(personnel.accuracy)}m</span>
          </div>
        </div>
      </div>
    `
  }, [])

  // Update or create marker for personnel
  const updatePersonnelMarker = useCallback((personnel: PersonnelLocation) => {
    if (!map.current) return

    const existingMarker = markers.current.get(personnel.user_id)
    
    if (existingMarker) {
      // Update existing marker position
      existingMarker.setLngLat([personnel.longitude, personnel.latitude])
      
      // Update popup content
      const popup = existingMarker.getPopup()
      if (popup) {
        popup.setHTML(createPopupContent(personnel))
      }
      
      // Update marker element
      const el = createMarkerElement(personnel)
      existingMarker.setElement(el)
    } else {
      // Create new marker
      const el = createMarkerElement(personnel)
      const popup = new maplibregl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(createPopupContent(personnel))
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([personnel.longitude, personnel.latitude])
        .setPopup(popup)
        .addTo(map.current)
      
      markers.current.set(personnel.user_id, marker)
    }
  }, [createMarkerElement, createPopupContent])

  // Draw trail for personnel
  const updatePersonnelTrail = useCallback(async (userId: string) => {
    if (!map.current || !showTrails) return

    // Fetch recent locations for trail (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: trailData } = await supabase
      .from('gps_locations')
      .select('latitude, longitude, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', oneHourAgo)
      .order('recorded_at', { ascending: true })
      .limit(100)

    if (!trailData || trailData.length < 2) return

    const sourceId = `trail-${userId}`
    const layerId = `trail-layer-${userId}`

    const coordinates = trailData.map(point => [point.longitude, point.latitude])

    const geojsonData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates
      }
    }

    if (map.current.getSource(sourceId)) {
      // Update existing source
      const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource
      source.setData(geojsonData)
    } else {
      // Add new source and layer
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      })

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      })
    }
  }, [supabase, showTrails])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'BTS Live Tracking - Premium',
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#f8f9fa'
            }
          },
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-opacity': 1.0,
              'raster-brightness-min': 0.0,
              'raster-brightness-max': 1.0,
              'raster-contrast': 0.1,
              'raster-saturation': 0.0
            }
          }
        ]
      },
      center,
      zoom,
      maxZoom: 19,
      minZoom: 5,
      pitch: 0,
      bearing: 0
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setIsLoaded(true)
    })

    // Cleanup
    return () => {
      if (map.current) {
        const currentMarkers = markers.current
        currentMarkers.forEach(marker => marker.remove())
        currentMarkers.clear()
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom]) // REMOVED loadPersonnelLocations dependency

  // Setup realtime subscription and initial load
  useEffect(() => {
    if (!isLoaded) return

    // Load initial personnel data
    ;(async () => {
      const { data, error } = await supabase
        .from('gps_locations')
        .select(`
          id,
          user_id,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          battery_level,
          recorded_at,
          source,
          profiles:user_id (
            id,
            full_name,
            role,
            avatar_url
          )
        `)
        .order('recorded_at', { ascending: false })

      if (error || !data) return

      const latestLocations = new Map<string, PersonnelLocation>()
      data.forEach((location: any) => {
        if (!latestLocations.has(location.user_id)) {
          latestLocations.set(location.user_id, location as PersonnelLocation)
        }
      })

      setPersonnelLocations(latestLocations)

      latestLocations.forEach(personnel => {
        updatePersonnelMarker(personnel)
        if (showTrails) {
          updatePersonnelTrail(personnel.user_id)
        }
      })

      if (latestLocations.size > 0 && map.current) {
        const bounds = new maplibregl.LngLatBounds()
        latestLocations.forEach(location => {
          bounds.extend([location.longitude, location.latitude])
        })
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
      }
    })()

    const channel = supabase
      .channel('live-gps-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gps_locations'
        },
        async (payload) => {
          const newLocation = payload.new as any

          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_url')
            .eq('id', newLocation.user_id)
            .single()

          if (!profile) return

          const personnelLocation: PersonnelLocation = {
            ...newLocation,
            profiles: profile
          }

          // Update state
          setPersonnelLocations(prev => {
            const updated = new Map(prev)
            updated.set(newLocation.user_id, personnelLocation)
            return updated
          })

          // Update marker
          updatePersonnelMarker(personnelLocation)
          
          // Update trail
          if (showTrails) {
            updatePersonnelTrail(newLocation.user_id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isLoaded]) // REMOVED: supabase, updatePersonnelMarker, updatePersonnelTrail, showTrails

  return (
    <div className={cn('relative', className)}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Harita yükleniyor...</p>
          </div>
        </div>
      )}
      
      {/* Personnel count badge */}
      {isLoaded && personnelLocations.size > 0 && (
        <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-white font-medium">
              {personnelLocations.size} Personel Aktif
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
