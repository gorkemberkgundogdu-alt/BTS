'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/hooks/use-auth'
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Building, 
  Route as RouteIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const routeSchema = z.object({
  title: z.string().min(3, 'Rota adı en az 3 karakter olmalı'),
  description: z.string().optional(),
  district: z.string().min(1, 'İlçe seçilmeli'),
  street: z.string().optional(),
  assigned_personnel: z.array(z.string()).min(1, 'En az 1 personel seçilmeli'),
  scheduled_date: z.string().min(1, 'Tarih seçilmeli'),
  scheduled_time: z.string().min(1, 'Saat seçilmeli'),
})

type RouteFormData = z.infer<typeof routeSchema>

interface Personnel {
  id: string
  full_name: string
  role: string
}

interface RouteCreationFormProps {
  isOpen: boolean
  onClose: () => void
  onRouteCreated?: () => void
}

// İstanbul ilçeleri
const ISTANBUL_DISTRICTS = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
]

export function RouteCreationForm({ isOpen, onClose, onRouteCreated }: RouteCreationFormProps) {
  const supabase = createClient()
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
  })

  // Load personnel
  useEffect(() => {
    const loadPersonnel = async () => {
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('municipality_id')
        .eq('id', user.id)
        .single()

      if (!profile?.municipality_id) return

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('municipality_id', profile.municipality_id)
        .in('role', ['worker', 'driver'])
        .order('full_name')

      if (data) {
        setPersonnel(data as Personnel[])
      }
    }

    if (isOpen) {
      loadPersonnel()
    }
  }, [isOpen, user, supabase])

  const togglePersonnel = (personnelId: string) => {
    const newSelection = selectedPersonnel.includes(personnelId)
      ? selectedPersonnel.filter(id => id !== personnelId)
      : [...selectedPersonnel, personnelId]
    
    setSelectedPersonnel(newSelection)
    setValue('assigned_personnel', newSelection)
  }

  const onSubmit = async (data: RouteFormData) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('municipality_id')
        .eq('id', user.id)
        .single()

      if (!profile?.municipality_id) {
        throw new Error('Belediye bilgisi bulunamadı')
      }

      const routeData = {
        name: data.title,
        description: data.description || null,
        start_location: `${data.district}${data.street ? ', ' + data.street : ''}`,
        scheduled_start: `${data.scheduled_date}T${data.scheduled_time}:00`,
        status: 'planned',
        municipality_id: profile.municipality_id,
        created_by: user.id
      }

      const { data: newRoute, error: routeError } = await supabase
        .from('routes')
        .insert([routeData])
        .select()
        .single()

      if (routeError) throw routeError

      // Assign personnel to route
      const assignmentPromises = data.assigned_personnel.map(personnelId =>
        supabase.from('route_assignments').insert([{
          route_id: newRoute.id,
          user_id: personnelId,
          municipality_id: profile.municipality_id
        }])
      )

      await Promise.all(assignmentPromises)

      setSuccess(true)
      reset()
      setSelectedPersonnel([])
      
      if (onRouteCreated) {
        onRouteCreated()
      }

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Route creation error:', err)
      setError(err instanceof Error ? err.message : 'Rota oluşturulamadı')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 animate-in slide-in-from-top-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <RouteIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Yeni Rota Oluştur</h2>
              <p className="text-sm text-slate-400 mt-0.5">Temizlik rotası ve personel ataması</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Rota Bilgileri */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-blue-400" />
              Rota Bilgileri
            </h3>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Rota Adı *
              </label>
              <Input
                {...register('title')}
                placeholder="Örn: Kadıköy Merkez Temizlik Rotası"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              {errors.title && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Açıklama
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Rota hakkında detaylı bilgi..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lokasyon */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-400" />
              Lokasyon
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  İlçe *
                </label>
                <select
                  {...register('district')}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">İlçe seçin</option>
                  {ISTANBUL_DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                {errors.district && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.district.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Sokak / Cadde
                </label>
                <Input
                  {...register('street')}
                  placeholder="Örn: Bağdat Caddesi"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Tarih ve Saat */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              Planlama
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Tarih *
                </label>
                <Input
                  {...register('scheduled_date')}
                  type="date"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                {errors.scheduled_date && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.scheduled_date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Saat *
                </label>
                <Input
                  {...register('scheduled_time')}
                  type="time"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                {errors.scheduled_time && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.scheduled_time.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Personel Seçimi */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-400" />
              Personel Ataması ({selectedPersonnel.length} seçili)
            </h3>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {personnel.map(person => (
                <div
                  key={person.id}
                  onClick={() => togglePersonnel(person.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    selectedPersonnel.includes(person.id)
                      ? "bg-blue-600/20 border-blue-500/50 shadow-lg"
                      : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                    selectedPersonnel.includes(person.id)
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  )}>
                    {person.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{person.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {person.role === 'worker' ? 'Temizlik Personeli' : 'Sürücü'}
                    </p>
                  </div>
                  {selectedPersonnel.includes(person.id) && (
                    <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {errors.assigned_personnel && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.assigned_personnel.message}
              </p>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">Rota başarıyla oluşturuldu!</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Rota Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
