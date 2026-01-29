'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LiveTrackingMap } from '@/components/maps/live-tracking-map'
import { createClient } from '@/lib/supabase/client'
import { Plus, MapPin, Users, Filter } from 'lucide-react'

interface PersonnelInfo {
  id: string
  full_name: string
  role: string
  status: string
  last_location?: {
    latitude: number
    longitude: number
    recorded_at: string
    battery_level?: number
    speed?: number
  }
}

export default function RoutesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [personnel, setPersonnel] = useState<PersonnelInfo[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Load personnel with their latest locations
  useEffect(() => {
    loadPersonnel()
  }, [])

  const loadPersonnel = async () => {
    // Get all personnel (workers)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, status')
      .in('role', ['worker', 'driver'])
      .order('full_name')

    if (!profiles) return

    // Get latest location for each person
    const personnelWithLocations = await Promise.all(
      profiles.map(async (profile) => {
        const { data: location } = await supabase
          .from('gps_locations')
          .select('latitude, longitude, recorded_at, battery_level, speed')
          .eq('user_id', profile.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...profile,
          last_location: location || undefined
        }
      })
    )

    setPersonnel(personnelWithLocations)
  }

  // Setup realtime subscription for personnel updates
  useEffect(() => {
    const channel = supabase
      .channel('routes-personnel-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gps_locations'
        },
        () => {
          loadPersonnel()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredPersonnel = personnel.filter(p => {
    if (filter === 'all') return true
    if (filter === 'active') {
      if (!p.last_location) return false
      const lastUpdate = new Date(p.last_location.recorded_at)
      const minutesAgo = (Date.now() - lastUpdate.getTime()) / 60000
      return minutesAgo < 10 // Active if updated in last 10 minutes
    }
    if (filter === 'inactive') {
      if (!p.last_location) return true
      const lastUpdate = new Date(p.last_location.recorded_at)
      const minutesAgo = (Date.now() - lastUpdate.getTime()) / 60000
      return minutesAgo >= 10
    }
    return true
  })

  const activeCount = personnel.filter(p => {
    if (!p.last_location) return false
    const minutesAgo = (Date.now() - new Date(p.last_location.recorded_at).getTime()) / 60000
    return minutesAgo < 10
  }).length

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
          <div className="p-6 border-b border-slate-800">
            <Header 
              title="Personel Takibi" 
              description={`${personnel.length} toplam, ${activeCount} aktif`}
            />
            
            {/* Filter buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="flex-1"
              >
                Tümü ({personnel.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
                className="flex-1"
              >
                Aktif ({activeCount})
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('inactive')}
                className="flex-1"
              >
                Pasif ({personnel.length - activeCount})
              </Button>
            </div>
          </div>

          {/* Personnel list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredPersonnel.map((person) => {
              const isActive = person.last_location 
                ? (Date.now() - new Date(person.last_location.recorded_at).getTime()) / 60000 < 10
                : false

              return (
                <Card 
                  key={person.id}
                  className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => router.push(`/admin/personnel/${person.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-500'}`} />
                        <span className="font-medium text-white">{person.full_name}</span>
                      </div>
                      <Badge variant={person.role === 'worker' ? 'default' : 'info'}>
                        {person.role === 'worker' ? 'İşçi' : 'Sürücü'}
                      </Badge>
                    </div>
                    
                    {person.last_location ? (
                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {new Date(person.last_location.recorded_at).toLocaleString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {person.last_location.speed !== null && person.last_location.speed > 0 && (
                          <div className="flex items-center gap-2">
                            <span>Hız: {Math.round(person.last_location.speed * 3.6)} km/h</span>
                          </div>
                        )}
                        {person.last_location.battery_level !== null && (
                          <div className="flex items-center gap-2">
                            <span className={person.last_location.battery_level < 20 ? 'text-red-400' : ''}>
                              Batarya: {Math.round(person.last_location.battery_level)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        GPS verisi yok
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Users className="h-4 w-4 mr-2" />
              {showSidebar ? 'Listeyi Gizle' : 'Listeyi Göster'}
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{activeCount} personel aktif</span>
            </div>
          </div>

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Rota
          </Button>
        </div>
        
        <div className="flex-1">
          <LiveTrackingMap 
            className="h-full"
            showTrails={true}
            onPersonnelClick={(personnelId) => {
              router.push(`/admin/personnel/${personnelId}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}
