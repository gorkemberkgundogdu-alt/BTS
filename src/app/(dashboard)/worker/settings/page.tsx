'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProfile } from '@/lib/hooks/use-profile'
import { User, Lock, Bell, CheckCircle2, AlertCircle } from 'lucide-react'

export default function WorkerSettingsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { profile, refreshProfile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profil güncelleme
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      setSuccess('Profil bilgileriniz güncellendi')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncelleme başarısız')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        user?.email || '',
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      )

      if (resetError) throw resetError

      setSuccess('Şifre sıfırlama bağlantısı e-postanıza gönderildi')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Header title="Ayarlar" description="Hesap ayarları" />

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-500">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profil Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil Bilgileri
            </CardTitle>
            <CardDescription>
              Kişisel bilgilerinizi güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ad Soyad"
              />
              <Input
                label="Telefon"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0532 XXX XX XX"
              />
              <Input
                label="E-posta"
                value={user?.email || ''}
                disabled
                className="opacity-50"
              />
              <Button type="submit" isLoading={loading}>
                Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Güvenlik */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Güvenlik
            </CardTitle>
            <CardDescription>
              Şifre ve güvenlik ayarları
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Şifre Değiştir</p>
              <p className="text-xs text-slate-400">
                E-postanıza şifre sıfırlama bağlantısı gönderilecek
              </p>
              <Button
                variant="outline"
                onClick={handleChangePassword}
                isLoading={loading}
                className="w-full"
              >
                Şifre Sıfırlama Linki Gönder
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-300 mb-2">Hesap Bilgileri</p>
              <div className="space-y-2 text-xs text-slate-400">
                <p>Departman: <span className="text-white">{profile?.department || 'Belirtilmemiş'}</span></p>
                <p>Birim: <span className="text-white">{profile?.unit || 'Belirtilmemiş'}</span></p>
                <p>Durum: <span className="text-green-500">Aktif</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bildirimler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirimler
            </CardTitle>
            <CardDescription>
              Bildirim tercihlerinizi yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Görev Bildirimleri</p>
                <p className="text-xs text-slate-400">Yeni görev atandığında bildirim al</p>
              </div>
              <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full ml-auto" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Ses Bildirimleri</p>
                <p className="text-xs text-slate-400">Bildirim sesi çal</p>
              </div>
              <div className="w-12 h-6 bg-slate-700 rounded-full flex items-center px-1 cursor-pointer">
                <div className="w-4 h-4 bg-slate-400 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">GPS İzni</p>
                <p className="text-xs text-slate-400">Konum paylaşımı için gerekli</p>
              </div>
              <div className="w-12 h-6 bg-blue-500 rounded-full flex items-center px-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
