'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ClipboardList, CheckCircle, Clock, Award, Smartphone, MapPin, Download, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import Link from 'next/link'

interface WorkerStats {
  pending: number
  in_progress: number
  completed_this_month: number
  performance_score: number
}

interface TodayTask {
  id: string
  title: string
  description: string | null
  status: string
  scheduled_start: string | null
}

export default function WorkerDashboardPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [stats, setStats] = useState<WorkerStats>({
    pending: 0,
    in_progress: 0,
    completed_this_month: 0,
    performance_score: 0
  })
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadWorkerData = async () => {
      // Görev istatistikleri
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, completed_at')
        .eq('assigned_to', user.id)

      if (tasks) {
        const pending = tasks.filter(t => t.status === 'assigned').length
        const inProgress = tasks.filter(t => t.status === 'in_progress').length
        
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const completedThisMonth = tasks.filter(t => 
          t.status === 'completed' && 
          t.completed_at && 
          new Date(t.completed_at) >= startOfMonth
        ).length

        setStats({
          pending,
          in_progress: inProgress,
          completed_this_month: completedThisMonth,
          performance_score: 85 // Mock - gerçek hesaplama eklenebilir
        })
      }

      // Bugünün görevleri
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todayData } = await supabase
        .from('tasks')
        .select('id, title, description, status, scheduled_start')
        .eq('assigned_to', user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('scheduled_start', { ascending: true })
        .limit(10)

      if (todayData) {
        setTodayTasks(todayData)
      }

      setLoading(false)
    }

    loadWorkerData()

    // Real-time updates
    const channel = supabase
      .channel('worker-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`
        },
        () => {
          loadWorkerData()
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
        return <Badge variant="warning">Beklemede</Badge>
      case 'in_progress':
        return <Badge variant="info">Devam Ediyor</Badge>
      case 'completed':
        return <Badge variant="success">Tamamlandı</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Ana Sayfa" description="Hoş geldiniz!" />
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
        description="Hoş geldiniz! Günlük görevlerinizi buradan takip edebilirsiniz."
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Bekleyen Görevler"
          value={stats.pending}
          description="Size atanan görevler"
          icon={Clock}
        />
        <StatsCard
          title="Devam Eden"
          value={stats.in_progress}
          description="Şu anda üzerinde çalıştığınız"
          icon={ClipboardList}
        />
        <StatsCard
          title="Bu Ay Tamamlanan"
          value={stats.completed_this_month}
          description="Başarıyla tamamladınız"
          icon={CheckCircle}
        />
        <StatsCard
          title="Performans Skoru"
          value={stats.performance_score}
          description="Bu ay ortalama puanınız"
          icon={Award}
        />
      </div>

      {/* Traccar GPS Setup Instructions */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">GPS Konum Takibi</CardTitle>
              <CardDescription>Traccar Client ile konumunuzu paylaşın</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-white">Traccar Client Durumu</p>
                <p className="text-xs text-slate-400">Mobil uygulama üzerinden GPS gönderimi</p>
              </div>
            </div>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Aktif</Badge>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Traccar Client'ı İndirin</h4>
                <p className="text-sm text-slate-400 mb-3">Telefonunuza uygun uygulamayı yükleyin</p>
                <div className="flex flex-wrap gap-2">
                  <a 
                    href="https://play.google.com/store/apps/details?id=org.traccar.client" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm text-white transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Android (Google Play)
                  </a>
                  <a 
                    href="https://apps.apple.com/app/traccar-client/id843156974" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm text-white transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    iOS (App Store)
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 font-semibold text-sm">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Sunucu Ayarlarını Yapın</h4>
                <p className="text-sm text-slate-400 mb-3">Traccar Client'ta Settings menüsüne girin ve aşağıdaki ayarları girin:</p>
                <div className="space-y-2 bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Server URL:</span>
                    <code className="text-xs text-blue-400 bg-slate-800 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/gps?id={user?.id || 'USER_ID'}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Frequency:</span>
                    <code className="text-xs text-green-400">60 seconds</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Distance:</span>
                    <code className="text-xs text-green-400">10 meters</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Accuracy:</span>
                    <code className="text-xs text-green-400">High</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 font-semibold text-sm">
                3
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Takibi Başlatın</h4>
                <p className="text-sm text-slate-400 mb-3">Uygulamada "Start" butonuna basın ve konum izni verin. Arka planda çalışmasına izin verin.</p>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-green-400">GPS takibi aktif olduğunda konumunuz yöneticiniz tarafından görülebilir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-400">
                <strong>Önemli:</strong> Batarya tasarrufu modunu kapatın ve uygulamanın arka planda çalışmasına izin verin. Aksi halde GPS güncellemeleri durabilir.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Görevlerim</CardTitle>
              <CardDescription>Size atanan görevler</CardDescription>
            </div>
            <Link href="/worker/my-tasks">
              <Button size="sm" variant="outline">Tümünü Gör</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Size henüz görev atanmamış</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayTasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 p-4 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-white">{task.title}</p>
                      {getStatusBadge(task.status)}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    {task.scheduled_start && (
                      <p className="mt-1 text-xs text-slate-500">
                        Başlangıç: {new Date(task.scheduled_start).toLocaleString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link 
              href="/worker/my-tasks"
              className="flex flex-col items-center justify-center rounded-lg border border-slate-700 p-6 transition-colors hover:border-blue-500 hover:bg-slate-800"
            >
              <ClipboardList className="h-8 w-8 text-blue-500" />
              <span className="mt-2 text-sm font-medium text-white">Görevlerim</span>
            </Link>
            <Link 
              href="/worker/performance"
              className="flex flex-col items-center justify-center rounded-lg border border-slate-700 p-6 transition-colors hover:border-blue-500 hover:bg-slate-800"
            >
              <Award className="h-8 w-8 text-blue-500" />
              <span className="mt-2 text-sm font-medium text-white">Performansım</span>
            </Link>
            <Link 
              href="/worker/my-route"
              className="flex flex-col items-center justify-center rounded-lg border border-slate-700 p-6 transition-colors hover:border-blue-500 hover:bg-slate-800"
            >
              <Clock className="h-8 w-8 text-blue-500" />
              <span className="mt-2 text-sm font-medium text-white">Rotam</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
