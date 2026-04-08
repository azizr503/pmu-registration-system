"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock } from 'lucide-react'
import { getPostLoginPath } from '@/lib/constants/navigation'
import { normalizePmuEmail } from '@/lib/email-normalize'

export default function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = searchParams.get('redirect') || '/'
  const roleParam = (searchParams.get('role') || '').toLowerCase()

  const signInHeadline =
    roleParam === 'faculty'
      ? 'Sign in to your PMU Faculty Account'
      : roleParam === 'student'
        ? 'Sign in to your PMU Student Account'
        : 'Sign in to your PMU Account'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const data = await login(normalizePmuEmail(formData.email), formData.password)
      router.push(getPostLoginPath(data.user, redirectTo))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,#f0f2f5_45%,#e8edf5_100%)] text-[#1e2a3a]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-8 sm:px-6">
        <div className="page-fade-in mb-6 text-center">
          <img
            src="/img/pmulogo.png"
            alt="Prince Mohammad Bin Fahd University"
            className="mx-auto mb-5 h-auto max-h-[80px] w-auto max-w-[260px] object-contain"
          />
          <h1 className="text-xl font-semibold text-[#1a5fb4] sm:text-2xl">Welcome Back</h1>
          <p className="mt-2 text-sm text-[#4a5568] sm:text-base">{signInHeadline}</p>
        </div>

        <div className="page-fade-in w-full max-w-[480px] self-center rounded-xl bg-[#1e2a3a] p-6 shadow-xl sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-white">Sign In</h2>
              <p className="mt-1 text-sm text-white/70">Use your PMU Email ID without @pmu.edu.sa</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <Alert variant="destructive" className="border-red-400/50 bg-red-950/50 text-white">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-white/90">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-11 border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-[#1a5fb4]"
                  placeholder="s.202012345 or first.last"
                  aria-label="Email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/90">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="h-11 border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-[#1a5fb4]"
                  placeholder="Enter your password"
                  aria-label="Password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-[#1a5fb4] font-medium text-white hover:bg-[#154a96]"
              disabled={isLoading}
              aria-label="Sign in"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

            <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-white/70">
              Need help?{' '}
              <a
                href="mailto:itsupport@pmu.edu.sa"
                className="font-medium text-[#e05a00] underline-offset-4 hover:underline"
              >
                Contact IT Support
              </a>
            </p>
            <p className="mt-4 text-center text-sm text-white/50">
              <Link href="/" className="hover:text-white/80">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
