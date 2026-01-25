'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const { profile, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {description && (
            <p className="text-sm text-slate-400">{description}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* User Info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-xs">
              <p className="text-white font-medium">{profile?.full_name || 'Kullanıcı'}</p>
              <p className="text-slate-400">
                {profile?.role === 'admin' && 'Yönetici'}
                {profile?.role === 'supervisor' && 'Süpervizör'}
                {profile?.role === 'personnel' && 'Personel'}
              </p>
            </div>
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Logout */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline ml-2">Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
