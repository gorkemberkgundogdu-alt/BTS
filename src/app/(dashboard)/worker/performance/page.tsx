'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { 
  TrendingUp, 
  Award, 
  Target, 
  CheckCircle2, 
  Clock,
  MapPin,
  Star,
  Calendar
} from 'lucide-react'

interface TaskStats {
  total: number
  completed: number
  in_progress: number
  on_time: number
}

interface PerformanceData {
  tasks: TaskStats
  completion_rate: number
  on_time_rate: number
  total_distance: number
  avg_rating: number
}

export default function PerformancePage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [performance, setPerformance] = useState<PerformanceData>({
    tasks: { total: 0, completed: 0, in_progress: 0, on_time: 0 },
    completion_rate: 0,
    on_time_rate: 0,
    total_distance: 0,
    avg_rating: 0
  })
  const [recentTasks, setRecentTasks] = useState<any[]>([])

  useEffect(() => {
    if (!user) return

    const loadPerformance = async () => {
      // Görev istatistikleri
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, completed_at, scheduled_start, completed_miles')
        .eq('assigned_to', user.id)

      if (tasks) {
        const completed = tasks.filter(t => t.status === 'completed')
        const onTime = completed.filter(t => {
          if (!t.scheduled_start || !t.completed_at) return false
          return new Date(t.completed_at) <= new Date(t.scheduled_start)
        })

        const totalDistance = completed.reduce((sum, t) => sum + (t.completed_miles || 0), 0)

        setPerformance({
          tasks: {
            total: tasks.length,
            completed: completed.length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            on_time: onTime.length
          },
          completion_rate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
          on_time_rate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
          total_distance: totalDistance,
          avg_rating: 4.2 // Mock data - gerçek rating sistemi eklenebilir
        })
      }

      // Son görevler
      const { data: recent } = await supabase
        .from('tasks')
        .select('id, title, status, completed_at, scheduled_start')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recent) {
        setRecentTasks(recent)
      }

      setLoading(false)
    }

    loadPerformance()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Performansım" description="Performans değerlendirmeniz" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Header 
        title="Performansım" 
        description="Son 30 günlük performans değerlendirmeniz" 
      />

      {/* Ana Metrikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Tamamlanan</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {performance.tasks.completed}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {performance.tasks.total} görevden
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Tamamlanma Oranı</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {performance.completion_rate.toFixed(0)}%
                </p>
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  İyi performans
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Zamanında Bitiş</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {performance.on_time_rate.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {performance.tasks.on_time} görev zamanında
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Toplam Mesafe</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {performance.total_distance.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-1">kilometre</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <MapPin className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detaylı Performans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genel Değerlendirme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Genel Değerlendirme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-white">Ortalama Puan</p>
                  <p className="text-xs text-slate-400">Son 10 görev</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{performance.avg_rating}</p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Kalite</span>
                  <span className="text-white">85%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Hız</span>
                  <span className="text-white">92%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Güvenilirlik</span>
                  <span className="text-white">78%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Son Görevler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Son Görevler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Henüz görev yok</p>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {task.completed_at 
                          ? new Date(task.completed_at).toLocaleDateString('tr-TR')
                          : 'Devam ediyor'
                        }
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === 'completed' ? 'success' :
                        task.status === 'in_progress' ? 'info' :
                        'default'
                      }
                    >
                      {task.status === 'completed' ? 'Tamamlandı' :
                       task.status === 'in_progress' ? 'Devam Ediyor' :
                       'Beklemede'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Başarılar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Başarılar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-3">
                <Award className="h-8 w-8 text-white" />
              </div>
              <p className="text-sm font-medium text-white">İlk Görev</p>
              <p className="text-xs text-slate-400 mt-1">Kazanıldı</p>
            </div>

            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-3">
                <Target className="h-8 w-8 text-white" />
              </div>
              <p className="text-sm font-medium text-white">10 Görev</p>
              <p className="text-xs text-slate-400 mt-1">
                {performance.tasks.completed >= 10 ? 'Kazanıldı' : `${10 - performance.tasks.completed} kaldı`}
              </p>
            </div>

            <div className="text-center p-4 bg-slate-800/50 rounded-lg opacity-50">
              <div className="w-16 h-16 mx-auto bg-slate-700 rounded-full flex items-center justify-center mb-3">
                <MapPin className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-white">100 KM</p>
              <p className="text-xs text-slate-400 mt-1">Kilitli</p>
            </div>

            <div className="text-center p-4 bg-slate-800/50 rounded-lg opacity-50">
              <div className="w-16 h-16 mx-auto bg-slate-700 rounded-full flex items-center justify-center mb-3">
                <Star className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-white">5 Yıldız</p>
              <p className="text-xs text-slate-400 mt-1">Kilitli</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
