'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Users, UserPlus, MapPin, Phone, Mail, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Personnel {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  department: string | null
  unit: string | null
  employee_id: string | null
  status: string
  avatar_url: string | null
  created_at: string
  device_mappings?: Array<{
    device_id: string
    is_active: boolean
  }>
}

export default function PersonnelPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [newDeviceId, setNewDeviceId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadPersonnel = async () => {
      // Load personnel with device mappings
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'personnel')
        .order('full_name')

      if (!profilesData) {
        setLoading(false)
        return
      }

      // Filter by status
      const filtered = filter === 'all' 
        ? profilesData 
        : profilesData.filter(p => p.status === filter)

      // Load device mappings for each personnel
      const personnelWithDevices = await Promise.all(
        filtered.map(async (person) => {
          const { data: mappings } = await supabase
            .from('device_mappings')
            .select('device_id, is_active')
            .eq('user_id', person.id)
            .eq('is_active', true)

          return {
            ...person,
            device_mappings: mappings || []
          }
        })
      )

      setPersonnel(personnelWithDevices)
      setLoading(false)
    }

    loadPersonnel()
  }, [user, supabase, filter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Aktif</Badge>
      case 'inactive':
        return <Badge variant="error">Pasif</Badge>
      case 'on_leave':
        return <Badge variant="warning">İzinli</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const handleSaveDeviceId = async (personnelId: string) => {
    if (!newDeviceId.trim()) {
      alert('Cihaz ID boş olamaz')
      return
    }

    setSaving(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id, municipality_id')
        .eq('id', currentUser.id)
        .single()

      if (!adminProfile) throw new Error('Admin profile not found')

      const personProfile = personnel.find(p => p.id === personnelId)
      if (!personProfile) throw new Error('Personnel not found')

      // Insert/Update device mapping
      const { error } = await supabase
        .from('device_mappings')
        .upsert({
          device_id: newDeviceId.trim(),
          user_id: personnelId,
          municipality_id: adminProfile.municipality_id,
          mapped_by: adminProfile.id,
          is_active: true
        }, {
          onConflict: 'device_id'
        })

      if (error) throw error

      // Reload personnel
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'personnel')
        .order('full_name')

      if (profilesData) {
        const filtered = filter === 'all' 
          ? profilesData 
          : profilesData.filter(p => p.status === filter)

        const personnelWithDevices = await Promise.all(
          filtered.map(async (person) => {
            const { data: mappings } = await supabase
              .from('device_mappings')
              .select('device_id, is_active')
              .eq('user_id', person.id)
              .eq('is_active', true)

            return {
              ...person,
              device_mappings: mappings || []
            }
          })
        )

        setPersonnel(personnelWithDevices)
      }

      setEditingDeviceId(null)
      setNewDeviceId('')
      alert('Cihaz ID kaydedildi!')
    } catch (error) {
      console.error('Error saving device ID:', error)
      alert('Hata: Cihaz ID kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDeviceId = async (personnelId: string, deviceId: string) => {
    if (!confirm('Bu cihaz eşleştirmesini kaldırmak istediğinize emin misiniz?')) {
      return
    }

    try {
      await supabase
        .from('device_mappings')
        .update({ is_active: false })
        .eq('device_id', deviceId)
        .eq('user_id', personnelId)

      // Reload
      window.location.reload()
    } catch (error) {
      console.error('Error removing device:', error)
      alert('Hata: Cihaz eşleştirmesi kaldırılamadı')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Personel" description="Personel yönetimi" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Header title="Personel" description="Personel yönetimi ve bilgileri" />
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Yeni Personel
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tümü ({personnel.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Aktif
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'inactive'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pasif
        </button>
      </div>

      {/* Personnel Grid */}
      {personnel.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">Personel bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personnel.map((person) => (
            <Card key={person.id} className="hover:border-blue-500/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {person.full_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {person.full_name || 'İsimsiz'}
                      </CardTitle>
                      {person.employee_id && (
                        <p className="text-xs text-slate-400">#{person.employee_id}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(person.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {person.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{person.email}</span>
                  </div>
                )}
                {person.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.department && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Building2 className="h-4 w-4" />
                    <span>{person.department}</span>
                  </div>
                )}
                {person.unit && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{person.unit}</span>
                  </div>
                )}

                {/* Device ID Section */}
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">GPS Cihaz ID</span>
                    {person.device_mappings && person.device_mappings.length > 0 ? (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                        Eşleştirilmiş
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">Yok</Badge>
                    )}
                  </div>
                  
                  {person.device_mappings && person.device_mappings.length > 0 ? (
                    <div className="space-y-2">
                      {person.device_mappings.map((mapping) => (
                        <div key={mapping.device_id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                          <code className="text-xs text-blue-400">{mapping.device_id}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDeviceId(person.id, mapping.device_id)}
                            className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            Kaldır
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : editingDeviceId === person.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value)}
                        placeholder="Örn: 123456789 veya IMEI"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveDeviceId(person.id)}
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDeviceId(null)
                            setNewDeviceId('')
                          }}
                          className="flex-1"
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDeviceId(person.id)
                        setNewDeviceId('')
                      }}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Cihaz ID Ekle
                    </Button>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Traccar Client'ta bu ID'yi kullanın
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <Link href={`/admin/personnel/${person.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Detay
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
