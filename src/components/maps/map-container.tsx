'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '@/lib/utils/cn'

interface MapContainerProps {
  center?: [number, number] // [lng, lat]
  zoom?: number
  className?: string
  onLoad?: (map: maplibregl.Map) => void
}

export function MapContainer({ 
  center = [35.2433, 38.9637], // Türkiye merkezi
  zoom = 6,
  className,
  onLoad
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
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
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center,
      zoom,
      maxZoom: 18,
      minZoom: 5
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    
    // Add geolocation control
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'top-right'
    )

    // On style.load event - harita tamamen hazır olduğunda
    map.current.on('style.load', () => {
      console.log('Map style loaded')
    })

    // On load event - harita yüklendiğinde
    map.current.on('load', () => {
      setIsLoaded(true)
      if (onLoad && map.current) {
        onLoad(map.current)
      }
    })

    // Error handling
    map.current.on('error', (e) => {
      console.error('Map error:', e)
    })

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom, onLoad])

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
    </div>
  )
}
