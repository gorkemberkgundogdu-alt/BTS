'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useGPSTracking } from '@/lib/hooks/use-gps-tracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, MapPin, Play } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_start?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export function TaskList() {
  const supabase = createClient()
  const { user } = useAuth()
  const { startTracking, isTracking } = useGPSTracking()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [startingTask, setStartingTask] = useState<string | null>(null)

  // Görevleri yükle
  useEffect(() => {
    if (!user) return

    const loadTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('created_at', { ascending: false })

      if (data) {
        setTasks(data)
      }
      setLoading(false)
    }

    loadTasks()

    // Real-time görev güncellemeleri
    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === (payload.new as Task).id ? (payload.new as Task) : task
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((task) => task.id !== (payload.old as Task).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // Görevi başlat (GPS tracking ile birlikte)
  const handleStartTask = async (taskId: string) => {
    console.log('🚀 Görev başlatma başladı, Task ID:', taskId)
    setStartingTask(taskId)

    try {
      console.log('📍 GPS tracking başlatılıyor...')
      // 1. GPS tracking'i başlat
      const trackingStarted = await startTracking()
      console.log('📍 GPS tracking sonucu:', trackingStarted)
      
      // Eğer tracking başlatılamadıysa hata göster
      if (!trackingStarted) {
        throw new Error('GPS izni alınamadı')
      }

      console.log('💾 Görev durumu güncelleniyor...')
      // 2. Görevi başlat
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString() 
        })
        .eq('id', taskId)
        .select()
        .single()
      
      console.log('💾 Görev güncelleme sonucu:', { data, error })
      
      if (error) throw error

      console.log('✅ Görev başarıyla başlatıldı!')
      alert('Görev başlatıldı! GPS takibi aktif.')
    } catch (err) {
      console.error('❌ Görev başlatma hatası:', err)
      alert('Görev başlatılamadı. GPS izni verildiğinden emin olun ve tekrar deneyin.')
    } finally {
      setStartingTask(null)
    }
  }

  // Görevi tamamla
  const handleCompleteTask = async (taskId: string) => {
    const confirmed = confirm('Bu görevi tamamladınız mı?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId)

      if (error) throw error

      // GPS tracking'i durdur
      // Bu göreve ait tüm GPS noktalarını trace olarak kaydet
      // (İleride eklenebilir)
      
      alert('Görev başarıyla tamamlandı!')
    } catch (err) {
      console.error('Görev tamamlama hatası:', err)
      alert('Görev tamamlanamadı')
    }
  }

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="default">Atandı</Badge>
      case 'in_progress':
        return <Badge variant="info">Devam Ediyor</Badge>
      case 'completed':
        return <Badge variant="success">Tamamlandı</Badge>
      case 'cancelled':
        return <Badge variant="error">İptal Edildi</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Henüz atanmış görev yok</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                {task.description && (
                  <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                )}
              </div>
              {getStatusBadge(task.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              {task.scheduled_start && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(task.scheduled_start).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {task.started_at && (
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  <span>
                    Başladı: {new Date(task.started_at).toLocaleTimeString('tr-TR')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {task.status === 'assigned' && (
                <Button
                  onClick={() => handleStartTask(task.id)}
                  className="flex-1"
                  isLoading={startingTask === task.id}
                  disabled={!!startingTask}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Görevi Başlat
                </Button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <Button
                    onClick={() => handleCompleteTask(task.id)}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Tamamla
                  </Button>
                  {isTracking && (
                    <Badge variant="success" className="self-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      GPS Aktif
                    </Badge>
                  )}
                </>
              )}
            </div>

            {task.status === 'assigned' && (
              <p className="text-xs text-slate-400">
                ℹ️ Görevi başlattığınızda GPS takibi otomatik olarak başlayacak
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
