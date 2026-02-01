'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ClipboardList, Users, Route, CheckCircle, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { LiveTrackingMap } from '@/components/maps/live-tracking-map'

interface DashboardStats {
  active_tasks: number
  active_personnel: number
  total_routes: number
  completed_tasks_this_month: number
}

interface RecentTask {
  id: string
  title: string
  status: string
  created_at: string
  profiles: {
    full_name: string
  } | null
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    active_tasks: 0,
    active_personnel: 0,
    total_routes: 0,
    completed_tasks_this_month: 0
  })
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadDashboardData = async () => {
      // Aktif görevler
      const { count: activeTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['assigned', 'in_progress'])

      // Aktif personel
      const { count: activePersonnel } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'personnel')
        .eq('status', 'active')

      // Toplam rotalar
      const { count: totalRoutes } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)

      // Bu ay tamamlanan görevler
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: completedThisMonth } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())

      setStats({
        active_tasks: activeTasks || 0,
        active_personnel: activePersonnel || 0,
        total_routes: totalRoutes || 0,
        completed_tasks_this_month: completedThisMonth || 0
      })

      // Son görevler
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          profiles:assigned_to (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (tasks) {
        setRecentTasks(tasks as any)
      }

      setLoading(false)
    }

    loadDashboardData()

    // Real-time updates
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('📊 Dashboard task update:', payload)
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="default">Atandı</Badge>
      case 'in_progress':
        return <Badge variant="info">Devam Ediyor</Badge>
      case 'completed':
        return <Badge variant="success">Tamamlandı</Badge>
      case 'cancelled':
        return <Badge variant="error">İptal</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} dakika önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    return `${diffDays} gün önce`
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Ana Sayfa" description="Belediye temizlik operasyonlarına genel bakış" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Ana Sayfa" 
        description="Belediye temizlik operasyonlarına genel bakış"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktif Görevler"
          value={stats.active_tasks}
          description="Devam eden temizlik görevleri"
          icon={ClipboardList}
        />
        <StatsCard
          title="Aktif Personel"
          value={stats.active_personnel}
          description="Sahadaki personel sayısı"
          icon={Users}
        />
        <StatsCard
          title="Rotalar"
          value={stats.total_routes}
          description="Toplam temizlik rotası"
          icon={Route}
        />
        <StatsCard
          title="Tamamlanan Görevler"
          value={stats.completed_tasks_this_month}
          description="Bu ay tamamlanan"
          icon={CheckCircle}
        />
      </div>

      {/* Live GPS Tracking Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Canlı Personel Takip
              </CardTitle>
              <CardDescription>
                Sahada çalışan personelin anlık konumları ve hareketleri
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LiveTrackingMap 
            className="w-full h-[600px]" 
            showTrails={true}
            onPersonnelClick={(userId) => {
              window.location.href = `/admin/personnel/${userId}`
            }}
          />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Görevler</CardTitle>
            <CardDescription>En son oluşturulan görevler</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Henüz görev yok</p>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {task.profiles?.full_name || 'Atanmamış'} - {getStatusBadge(task.status)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 ml-2 shrink-0">
                      {getTimeAgo(task.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>Sık kullanılan özellikler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/admin/tasks"
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
              >
                <ClipboardList className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Görev Ata</p>
              </a>
              <a
                href="/admin/personnel"
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
              >
                <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Personel</p>
              </a>
              <a
                href="/admin/routes"
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
              >
                <Route className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Rotalar</p>
              </a>
              <a
                href="/admin/settings"
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
              >
                <CheckCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Ayarlar</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
