'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LiveTrackingMap } from '@/components/maps/live-tracking-map'
import { RouteCreationForm } from '@/components/forms/route-creation-form'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Plus, MapPin, Users, Battery, Gauge, Clock } from 'lucide-react'

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
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false)

  // Load personnel with their latest locations
  useEffect(() => {
    loadPersonnel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-96 border-r border-slate-800/50 flex flex-col bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <div className="p-6 space-y-6">
            {/* Header with Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Canlı Takip</h1>
                  <p className="text-sm text-slate-400 mt-1">Personel lokasyon yönetimi</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-400">{activeCount} Aktif</span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
                  <div className="text-2xl font-bold text-white">{personnel.length}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Toplam</div>
                </div>
                <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{activeCount}</div>
                  <div className="text-xs text-green-300/70 mt-0.5">Aktif</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
                  <div className="text-2xl font-bold text-slate-300">{personnel.length - activeCount}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Pasif</div>
                </div>
              </div>
            </div>
            
            {/* Filter buttons - Modern Pills */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className={cn(
                  "flex-1 rounded-lg transition-all duration-200",
                  filter === 'all' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                Tümü
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('active')}
                className={cn(
                  "flex-1 rounded-lg transition-all duration-200",
                  filter === 'active' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                Aktif
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('inactive')}
                className={cn(
                  "flex-1 rounded-lg transition-all duration-200",
                  filter === 'inactive' 
                    ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-lg shadow-slate-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                Pasif
              </Button>
            </div>
          </div>

          {/* Personnel list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {filteredPersonnel.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Personel bulunamadı</p>
              </div>
            ) : (
              filteredPersonnel.map((person) => {
                const isActive = person.last_location 
                  ? (Date.now() - new Date(person.last_location.recorded_at).getTime()) / 60000 < 10
                  : false

                return (
                  <Card 
                    key={person.id}
                    className={cn(
                      "group cursor-pointer transition-all duration-200 border-slate-700/50 bg-slate-800/40 backdrop-blur-sm",
                      "hover:bg-slate-800/70 hover:border-slate-600/50 hover:shadow-lg hover:scale-[1.02]",
                      isActive && "border-green-500/20 bg-green-500/5"
                    )}
                    onClick={() => router.push(`/admin/personnel/${person.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                            isActive 
                              ? "bg-green-500/20 text-green-400 ring-2 ring-green-500/30" 
                              : "bg-slate-700/50 text-slate-400"
                          )}>
                            {person.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-sm leading-tight">
                              {person.full_name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {person.role === 'worker' ? 'Temizlik Personeli' : 'Araç Sürücüsü'}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={isActive ? 'success' : 'secondary'}
                          className={cn(
                            "text-xs font-medium",
                            isActive && "bg-green-500/10 text-green-400 border-green-500/30"
                          )}
                        >
                          {isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </div>
                      
                      {person.last_location ? (
                        <div className="space-y-2 pt-2 border-t border-slate-700/50">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-medium">
                              {new Date(person.last_location.recorded_at).toLocaleString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {person.last_location.speed !== null && person.last_location.speed > 0 && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Gauge className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-slate-300 font-medium">
                                  {Math.round(person.last_location.speed * 3.6)}
                                </span>
                                <span className="text-slate-500">km/s</span>
                              </div>
                            )}
                            {person.last_location.battery_level !== null && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Battery className={cn(
                                  "h-3.5 w-3.5",
                                  person.last_location.battery_level < 20 ? "text-red-400" : "text-green-400"
                                )} />
                                <span className={cn(
                                  "font-medium",
                                  person.last_location.battery_level < 20 ? "text-red-400" : "text-slate-300"
                                )}>
                                  {Math.round(person.last_location.battery_level)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                          <MapPin className="h-3.5 w-3.5 text-slate-600" />
                          <span className="text-xs text-slate-500">
                            GPS verisi mevcut değil
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar - Premium Style */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600 text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showSidebar ? 'Listeyi Gizle' : 'Personel Listesi'}
                </Button>
                
                <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                  <div className="text-sm">
                    <span className="font-bold text-green-400">{activeCount}</span>
                    <span className="text-green-300/70 ml-1">personel canlı</span>
                  </div>
                </div>
              </div>

              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                onClick={() => setIsRouteFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Yeni Rota Oluştur
              </Button>
            </div>
          </div>
        </div>
        
        {/* Map */}
        <div className="flex-1 relative">
          <LiveTrackingMap 
            className="h-full w-full"
            center={[29.0, 41.0]}
            zoom={11}
            showTrails={true}
            onPersonnelClick={(personnelId) => {
              router.push(`/admin/personnel/${personnelId}`)
            }}
          />
        </div>
      </div>

      {/* Route Creation Form */}
      <RouteCreationForm 
        isOpen={isRouteFormOpen}
        onClose={() => setIsRouteFormOpen(false)}
        onRouteCreated={() => {
          // Refresh personnel list or show success message
          loadPersonnel()
        }}
      />
    </div>
  )
}
