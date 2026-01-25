'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/hooks/use-auth'
import { CheckCircle2, AlertCircle, Users } from 'lucide-react'

const taskSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalı'),
  description: z.string().optional(),
  assigned_to: z.string().min(1, 'Personel seçilmeli'),
  route_id: z.string().optional(),
  scheduled_start: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface Personnel {
  id: string
  full_name: string
  department?: string
}

export function TaskAssignmentForm() {
  const supabase = createClient()
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  // Personel listesini yükle
  useEffect(() => {
    const loadPersonnel = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .eq('role', 'personnel')
        .eq('status', 'active')
        .order('full_name')

      if (data) {
        setPersonnel(data)
      }
    }

    loadPersonnel()
  }, [supabase])

  const onSubmit = async (data: TaskFormData) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // Görev oluştur
      const { error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: data.title,
          description: data.description || null,
          assigned_to: data.assigned_to,
          route_id: data.route_id || null,
          scheduled_start: data.scheduled_start || null,
          status: 'assigned',
          created_by: user.id,
        }] as any)

      if (taskError) throw taskError

      setSuccess(true)
      reset()

      // 2 saniye sonra success mesajını kaldır
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görev oluşturulamadı')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Görev Ata
        </CardTitle>
        <CardDescription>
          Personele yeni görev atayın
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-sm text-green-500">Görev başarıyla oluşturuldu!</p>
            </div>
          )}

          <Input
            label="Görev Başlığı"
            placeholder="Örn: Atatürk Caddesi Temizliği"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Açıklama (İsteğe Bağlı)</label>
            <textarea
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Görev detayları..."
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Personel Seç *</label>
            <select
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('assigned_to')}
            >
              <option value="">Personel seçin...</option>
              {personnel.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name} {person.department && `(${person.department})`}
                </option>
              ))}
            </select>
            {errors.assigned_to && (
              <p className="text-xs text-red-500">{errors.assigned_to.message}</p>
            )}
          </div>

          <Input
            label="Başlangıç Zamanı (İsteğe Bağlı)"
            type="datetime-local"
            {...register('scheduled_start')}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
          >
            Görevi Ata
          </Button>
        </form>

        {personnel.length === 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Aktif personel bulunamadı.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
