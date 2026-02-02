'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileInput } from '@/lib/validations/auth'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProfile } from '@/lib/hooks/use-profile'
import { createClient } from '@/lib/supabase/client'
import { getCities } from '@/lib/utils/turkey-cities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingPage } from '@/components/ui/loading'

interface Municipality {
  id: string
  name: string
  city: string
  district: string
}

export default function CompleteProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { completeProfile } = useProfile()
  const [error, setError] = useState<string | null>(null)
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  })

  const selectedCity = watch('city')

  // Get Turkey cities with custom sorting (Istanbul, Ankara, Izmir first)
  const cities = (() => {
    const allCities = getCities()
    const priority = ['İstanbul', 'Ankara', 'İzmir']
    const priorityCities = allCities.filter(c => priority.includes(c))
    const otherCities = allCities.filter(c => !priority.includes(c))
    return [...priorityCities, ...otherCities]
  })()

  // Fetch municipalities when city is selected
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (!selectedCity) {
        setMunicipalities([])
        return
      }

      setLoadingMunicipalities(true)
      try {
        const { data, error } = await supabase
          .from('municipalities')
          .select('id, name, city, district')
          .eq('city', selectedCity)
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('Belediye yukleme hatasi:', error)
          setMunicipalities([])
        } else if (data) {
          console.log(`${selectedCity} icin ${data.length} belediye yuklendi`)
          setMunicipalities(data)
        } else {
          console.log(`${selectedCity} icin belediye bulunamadi`)
          setMunicipalities([])
        }
      } catch (err) {
        console.error('Beklenmeyen hata:', err)
        setMunicipalities([])
      } finally {
        setLoadingMunicipalities(false)
      }
    }

    loadMunicipalities()
  }, [selectedCity, supabase])

  const onSubmit = async (data: ProfileInput) => {
    try {
      setError(null)
      await completeProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil guncellenirken hata olustu')
    }
  }

  if (authLoading) {
    return <LoadingPage />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Oturum Bulunamadi</CardTitle>
            <CardDescription className="text-center">
              Lutfen giris yapin
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Filter municipalities (already filtered by query)
  const filteredMunicipalities = municipalities

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl">Profili Tamamla</CardTitle>
          <CardDescription className="text-center">
            Devam etmek icin lutfen profil bilgilerinizi tamamlayin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Ad Soyad *"
                type="text"
                placeholder="Ahmet Yılmaz"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <Input
                label="Telefon *"
                type="tel"
                placeholder="5XX XXX XX XX"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <Select
              label="Il *"
              options={[
                { value: '', label: 'Il seciniz' },
                ...cities.map(city => ({ value: city, label: city })),
              ]}
              error={errors.city?.message}
              {...register('city')}
            />

            <Select
              label="Belediye *"
              options={[
                { 
                  value: '', 
                  label: loadingMunicipalities 
                    ? 'Yukleniyor...' 
                    : !selectedCity 
                      ? 'Once il seciniz' 
                      : municipalities.length === 0
                        ? 'Bu ilde belediye bulunamadi'
                        : 'Belediye seciniz' 
                },
                ...municipalities.map(m => ({ value: m.id, label: `${m.name} (${m.district})` })),
              ]}
              error={errors.municipality_id?.message}
              disabled={!selectedCity || loadingMunicipalities}
              {...register('municipality_id')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Departman"
                type="text"
                placeholder="Temizlik İşleri"
                error={errors.department?.message}
                {...register('department')}
              />

              <Input
                label="Sicil No"
                type="text"
                placeholder="12345"
                error={errors.employee_id?.message}
                {...register('employee_id')}
              />
            </div>

            <Input
              label="Birim"
              type="text"
              placeholder="A Ekibi"
              error={errors.unit?.message}
              {...register('unit')}
            />

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
              >
                Profili Tamamla
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
