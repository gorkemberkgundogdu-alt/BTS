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
    console.log('🏠 [dashboard-layout] useEffect:', {
      isLoading,
      isAuthenticated,
      isProfileComplete
    })
    
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('🔒 [dashboard-layout] Redirecting to LOGIN')
        router.push('/login')
      } else if (!isProfileComplete) {
        console.log('⚠️ [dashboard-layout] Redirecting to COMPLETE-PROFILE')
        router.push('/complete-profile')
      } else {
        console.log('✅ [dashboard-layout] User is AUTHENTICATED and profile COMPLETE')
      }
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
