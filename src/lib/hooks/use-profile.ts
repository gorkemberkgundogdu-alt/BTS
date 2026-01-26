/**
 * Profile işlemleri için custom hook
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { ProfileInput } from '@/lib/validations/auth'

export function useProfile() {
  const router = useRouter()
  const { user, profile, setProfile } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const updateProfile = async (data: Partial<ProfileInput>) => {
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı')

    setIsLoading(true)
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(updatedProfile)
      return updatedProfile
    } finally {
      setIsLoading(false)
    }
  }

  const completeProfile = async (data: ProfileInput) => {
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı')

    setIsLoading(true)
    try {
      // Telefon numarasını formatla
      let formattedPhone = data.phone.replace(/\D/g, '')
      if (!formattedPhone.startsWith('90')) {
        formattedPhone = '90' + formattedPhone
      }

      // Get district from municipality
      const { data: municipalityData } = await supabase
        .from('municipalities')
        .select('district')
        .eq('id', data.municipality_id)
        .single<{ district: string }>()

      const district = municipalityData?.district || ''

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: formattedPhone,
          city: data.city,
          district: district,
          municipality_id: data.municipality_id,
          department: data.department,
          employee_id: data.employee_id,
          unit: data.unit,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(updatedProfile as never)
      
      // Redirect based on role
      if ((updatedProfile as never as { role: string }).role === 'personnel') {
        router.push('/worker')
      } else {
        router.push('/admin')
      }

      return updatedProfile as never
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data as never)
      }
    } catch (error) {
      console.error('Profile refresh error:', error)
    }
  }

  // #region agent log
  // Profile completeness check
  const isProfileComplete = !profile ? false : !!(
    profile.full_name &&
    profile.phone &&
    profile.city &&
    profile.district &&
    profile.municipality_id
  )
  
  // DEBUG LOG: Track isProfileComplete calculation
  console.log('🔍 [use-profile] isProfileComplete calculated:', {
    hasProfile: !!profile,
    isComplete: isProfileComplete,
    profileKeys: profile ? Object.keys(profile) : [],
    timestamp: new Date().toISOString()
  })
  // #endregion

  return {
    profile,
    isLoading,
    isProfileComplete,
    updateProfile,
    completeProfile,
    refreshProfile,
  }
}
