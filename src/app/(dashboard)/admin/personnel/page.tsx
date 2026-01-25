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
}

export default function PersonnelPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  useEffect(() => {
    if (!user) return

    const loadPersonnel = async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'personnel')
        .order('full_name')

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data } = await query

      if (data) {
        setPersonnel(data)
      }
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
