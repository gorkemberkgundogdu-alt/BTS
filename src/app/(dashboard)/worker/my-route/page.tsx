'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { MapContainer } from '@/components/maps/map-container'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useGPSTracking } from '@/lib/hooks/use-gps-tracking'
import { MapPin, Navigation, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import maplibregl from 'maplibre-gl'

interface Task {
  id: string
  title: string
  description: string
  status: string
  route: {
    name: string
    geojson: any
  }
}

export default function MyRoutePage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { isTracking, startTracking, stopTracking, currentLocation } = useGPSTracking()
  const [tasks, setTasks] = useState<Task[]>([])
  const [map, setMap] = useState<maplibregl.Map | null>(null)

  // Atanan görevleri ve rotaları yükle
  useEffect(() => {
    if (!user) return

    const loadMyTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          route:routes(name, geojson)
        `)
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })

      if (data) {
        setTasks(data as any)
      }
    }

    loadMyTasks()
  }, [user, supabase])

  // Haritaya rotaları çiz
  useEffect(() => {
    if (!map || tasks.length === 0) return

    tasks.forEach((task) => {
      if (!task.route?.geojson) return

      const sourceId = `my-route-${task.id}`
      const layerId = `my-route-layer-${task.id}`

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: task.route.geojson
        })

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': task.status === 'in_progress' ? '#3b82f6' : '#10b981',
            'line-width': 5,
            'line-opacity': 0.8
          }
        })
      }
    })

    // Kendi konumunu marker olarak ekle
    if (currentLocation) {
      const el = document.createElement('div')
      el.innerHTML = `
        <div class="w-12 h-12 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
          <div class="w-3 h-3 bg-white rounded-full"></div>
        </div>
      `

      new maplibregl.Marker({ element: el })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map)

      // Kendi konumuna zoom
      map.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 14
      })
    }
  }, [map, tasks, currentLocation])

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-800 space-y-4">
        <Header title="Rotam" description="Bugünkü rota ve konum bilgileriniz" />
        
        {/* GPS Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isTracking ? 'bg-green-500/10' : 'bg-slate-800'}`}>
                  <Navigation className={`h-5 w-5 ${isTracking ? 'text-green-500' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-white">GPS Takip</p>
                  <p className="text-sm text-slate-400">
                    {isTracking ? 'Konum paylaşılıyor' : 'Konum paylaşılmıyor'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isTracking ? 'outline' : 'primary'}
                onClick={isTracking ? stopTracking : startTracking}
              >
                {isTracking ? 'Durdur' : 'Başlat'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-white">{task.route?.name || task.title}</p>
                        <p className="text-sm text-slate-400">{task.description}</p>
                      </div>
                    </div>
                    <Badge variant={task.status === 'in_progress' ? 'info' : 'warning'}>
                      {task.status === 'in_progress' ? 'Devam Ediyor' : 'Beklemede'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {tasks.length > 0 ? (
          <MapContainer
            className="h-full"
            center={[28.9784, 41.0082]}
            zoom={12}
            onLoad={setMap}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Size henüz görev atanmamış</p>
              <p className="text-sm text-slate-500 mt-2">
                Yöneticiniz size görev atadığında rota burada görünecek
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
