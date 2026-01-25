'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer } from '@/components/maps/map-container'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import maplibregl from 'maplibre-gl'

interface Personnel {
  id: string
  full_name: string
  avatar_url?: string
  last_location?: {
    latitude: number
    longitude: number
    recorded_at: string
  }
}

interface Route {
  id: string
  name: string
  code: string
  geojson: any
}

export function TrackingMap() {
  const supabase = createClient()
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const markersRef = useRef(new Map<string, maplibregl.Marker>())

  /**
   * Personel ve konum verilerini yükle
   */
  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      console.log('🗺️ Harita verisi yükleniyor...')
      
      // Personel listesi
      const { data: personnelData, error: personnelError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'personnel')
        .eq('status', 'active')

      console.log('👥 Personel data:', personnelData, 'Error:', personnelError)

      // Her personel için son GPS konumu
      if (personnelData) {
        const personnelWithLocations = await Promise.all(
          personnelData.map(async (p) => {
            const { data: lastLocation, error: gpsError } = await supabase
              .from('gps_locations')
              .select('latitude, longitude, recorded_at')
              .eq('user_id', p.id)
              .order('recorded_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            console.log(`📍 ${p.full_name} konum:`, lastLocation, 'Error:', gpsError)

            return {
              ...p,
              last_location: lastLocation || undefined
            }
          })
        )

        console.log('✅ Personel with locations:', personnelWithLocations)
        setPersonnel(personnelWithLocations)
      }

      // Rotalar
      const { data: routesData } = await supabase
        .from('routes')
        .select('id, name, code, geojson')
        .eq('active', true)

      console.log('🛣️ Routes data:', routesData)
      if (routesData) {
        setRoutes(routesData)
      }
    }

    loadData()

    // Real-time GPS updates subscription
    const gpsChannel = supabase
      .channel('gps-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gps_locations'
        },
        (payload) => {
          console.log('📍 Real-time GPS update:', payload.new)
          const newLocation = payload.new as any
          
          // Personel konumunu güncelle
          setPersonnel((prev) =>
            prev.map((p) =>
              p.id === newLocation.user_id
                ? {
                    ...p,
                    last_location: {
                      latitude: newLocation.latitude,
                      longitude: newLocation.longitude,
                      recorded_at: newLocation.recorded_at
                    }
                  }
                : p
            )
          )
        }
      )
      .subscribe()

    console.log('📡 Real-time subscription başlatıldı')

    return () => {
      supabase.removeChannel(gpsChannel)
    }
  }, [user, supabase])

  /**
   * Haritada personel marker'larını güncelle
   */
  useEffect(() => {
    if (!map) return

    console.log('🗺️ Marker güncelleniyor, Personnel count:', personnel.length)
    const markers = markersRef.current

    // Sadece değişen marker'ları güncelle
    personnel.forEach((person) => {
      if (!person.last_location) {
        console.log(`❌ ${person.full_name} - Konum yok`)
        // Konum yoksa marker'ı kaldır
        const existingMarker = markers.get(person.id)
        if (existingMarker) {
          existingMarker.remove()
          markers.delete(person.id)
        }
        return
      }

      console.log(`✅ ${person.full_name} - Konum var:`, person.last_location)
      const existingMarker = markers.get(person.id)
      
      if (existingMarker) {
        // Mevcut marker'ı güncelle
        existingMarker.setLngLat([person.last_location.longitude, person.last_location.latitude])
        
        // Popup'ı güncelle
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="text-sm p-2">
            <p class="font-bold text-gray-900">${person.full_name}</p>
            <p class="text-xs text-gray-600">
              Son güncelleme: ${new Date(person.last_location.recorded_at).toLocaleTimeString('tr-TR')}
            </p>
          </div>
        `)
        existingMarker.setPopup(popup)
        console.log(`🔄 ${person.full_name} marker güncellendi`)
      } else {
        // Yeni marker ekle
        const el = document.createElement('div')
        el.className = 'relative'
        el.innerHTML = `
          <div class="relative">
            <div class="absolute -inset-1 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-10 h-10 bg-blue-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
              <span class="text-white text-sm font-bold">${person.full_name.charAt(0)}</span>
            </div>
          </div>
        `

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="text-sm p-2">
            <p class="font-bold text-gray-900">${person.full_name}</p>
            <p class="text-xs text-gray-600">
              Son güncelleme: ${new Date(person.last_location.recorded_at).toLocaleTimeString('tr-TR')}
            </p>
          </div>
        `)

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([person.last_location.longitude, person.last_location.latitude])
          .setPopup(popup)
          .addTo(map)

        markers.set(person.id, marker)
        console.log(`➕ ${person.full_name} marker eklendi`)
      }
    })

    // Silinen personellerin marker'larını kaldır
    const activePersonnelIds = new Set(personnel.map(p => p.id))
    markers.forEach((marker, id) => {
      if (!activePersonnelIds.has(id)) {
        marker.remove()
        markers.delete(id)
        console.log(`🗑️ Marker silindi: ${id}`)
      }
    })
  }, [map, personnel])

  /**
   * Haritada rotaları çiz
   */
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return

    routes.forEach((route) => {
      if (!route.geojson) return

      const sourceId = `route-${route.id}`
      const layerId = `route-layer-${route.id}`

      // Eğer source veya layer zaten varsa, skip et
      if (map.getSource(sourceId)) {
        return
      }

      try {
        // Source ekle
        map.addSource(sourceId, {
          type: 'geojson',
          data: route.geojson
        })

        // Layer ekle
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#10b981',
            'line-width': 4,
            'line-opacity': 0.8
          }
        })

        // Hover effect
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })

        // Click event
        map.on('click', layerId, () => {
          const popup = new maplibregl.Popup({ closeButton: true })
            .setHTML(`
              <div class="p-2">
                <p class="font-bold text-white">${route.name}</p>
                <p class="text-xs text-slate-400">Kod: ${route.code}</p>
              </div>
            `)
          
          // Rota geometrisinin ilk koordinatını al
          const coords = route.geojson.type === 'FeatureCollection' 
            ? route.geojson.features[0]?.geometry?.coordinates[0]
            : route.geojson.coordinates?.[0]
          
          if (coords) {
            popup.setLngLat(coords).addTo(map)
          }
        })
      } catch (error) {
        console.error(`Rota çizim hatası (${route.name}):`, error)
      }
    })
  }, [map, routes])

  return (
    <MapContainer
      className="h-full"
      center={[28.9784, 41.0082]} // İstanbul
      zoom={11}
      onLoad={setMap}
    />
  )
}
