'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProfile } from '@/lib/hooks/use-profile'
import { LoadingPage } from '@/components/ui/loading'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const { isProfileComplete } = useProfile()

  useEffect(() => {
    // Sadece ilk yüklemede kontrol et, her render'da değil
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login')
      router.replace('/login')
    } else if (!isLoading && isAuthenticated && !isProfileComplete) {
      console.log('⚠️ Profile incomplete, redirecting to complete-profile')
      router.replace('/complete-profile')
    }
  }, [isAuthenticated, isLoading, isProfileComplete, router])

  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated || !isProfileComplete) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-64">
        {children}
      </main>
    </div>
  )
}
