'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { TaskAssignmentForm } from '@/components/forms/task-assignment-form'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, XCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  location: string | null
  created_at: string
  assigned_to: string | null
  profiles: {
    full_name: string
  } | null
}

export default function TasksPage() {
  const supabase = createClient()
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const loadRecentTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        location,
        created_at,
        assigned_to,
        profiles:assigned_to (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setRecentTasks(data as Task[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRecentTasks()

    // Realtime subscription for new tasks
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          loadRecentTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor'
      case 'in_progress':
        return 'Devam Ediyor'
      case 'completed':
        return 'Tamamlandı'
      case 'cancelled':
        return 'İptal'
      default:
        return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/30'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Header title="Görevler" description="Temizlik görevlerini yönetin" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskAssignmentForm onTaskCreated={loadRecentTasks} />
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Son Oluşturulan Görevler</h3>
          
          {loading ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-400">Yükleniyor...</p>
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-400">Henüz görev oluşturulmamış</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <Card 
                  key={task.id}
                  className="bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                        {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(task.status)}
                        <span>{getStatusText(task.status)}</span>
                      </div>

                      {task.profiles && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-300">{task.profiles.full_name}</span>
                        </div>
                      )}

                      {task.location && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <MapPin className="h-3 w-3" />
                          <span className="text-slate-400">{task.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      {new Date(task.created_at).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
