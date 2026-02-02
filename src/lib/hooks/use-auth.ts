/**
 * Auth işlemleri için custom hook
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import type { LoginInput, RegisterInput } from '@/lib/validations/auth'

export function useAuth() {
  const router = useRouter()
  const { user, profile, isLoading, setUser, setProfile, setIsLoading, reset } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (isMounted && session?.user) {
          setUser(session.user)
          
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (isMounted && profileData) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Session check error:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        if (session?.user) {
          setUser(session.user)
          
          // Profile'ı da güncelle
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileData && isMounted) {
            setProfile(profileData)
          }
        } else {
          reset()
        }
        setIsLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, setUser, setProfile, setIsLoading, reset])

  const login = async ({ email, password }: LoginInput) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    } catch (err) {
      throw err
    }
  }

  const register = async ({ 
    email, 
    password, 
    role,
    full_name,
    phone,
    city,
    municipality_id,
    department,
    employee_id,
  }: RegisterInput) => {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Kullanıcı oluşturulamadı')

    // 2. Get district from municipality
    const { data: municipalityData } = await supabase
      .from('municipalities')
      .select('district')
      .eq('id', municipality_id)
      .single<{ district: string }>()

    const district = municipalityData?.district || ''

    // 3. Create profile immediately (don't rely on trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email,
        role,
        full_name,
        phone,
        city,
        district,
        municipality_id,
        department: department || null,
        employee_id: employee_id || null,
        status: 'active',
      }] as any)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw new Error('Profil oluşturulamadı: ' + profileError.message)
    }

    return authData
  }

  const logout = async () => {
    console.log('🔐 Supabase signOut başlatılıyor...')
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ SignOut hatası:', error)
      throw error
    }

    console.log('✅ Supabase signOut başarılı')
    reset()
    // Router push'u sidebar'da yapıyoruz, burada yapmaya gerek yok
  }

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }
}
