'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setError(null)
      console.log('1. Login başladı...')
      const result = await login(data)
      console.log('2. Login başarılı:', result.user?.id)
      
      // Get user's profile to check role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', result.user?.id)
        .single<{ role: string }>()
      
      console.log('3. Profile data:', profileData, 'Error:', profileError)
      
      // Redirect based on role
      const redirect = searchParams.get('redirect')
      
      // Eğer redirect '/' veya boşsa, role'e göre yönlendir
      if (redirect && redirect !== '/') {
        console.log('4. Redirecting to:', redirect)
        router.push(redirect)
      } else {
        const targetUrl = profileData?.role === 'personnel' ? '/worker' : '/admin'
        console.log('5. Redirecting to:', targetUrl, 'Role:', profileData?.role)
        router.push(targetUrl)
      }
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Giriş başarısız oldu')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl">BTS</CardTitle>
          <CardDescription className="text-center">
            Belediye Temizlik Sistemi&apos;ne Hoş Geldiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <Input
              label="E-posta"
              type="email"
              placeholder="ornek@belediye.gov.tr"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Şifre"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Giriş Yap
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-slate-400">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="text-blue-500 hover:underline">
              Kayıt Ol
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
