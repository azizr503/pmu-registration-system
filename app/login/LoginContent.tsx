"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock } from 'lucide-react'

export default function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Get redirect URL from search params
  const redirectTo = searchParams.get('redirect') || '/'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login(formData.email, formData.password)
      // Login successful, redirect to the intended page or home
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 bg-pmu-gray flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo and Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-pmu-blue mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to your <span className="text-pmu-blue font-semibold">PMU</span> Student Account
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border border-border bg-card">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 border-border focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="student@pmu.edu.sa"
                    aria-label="Email address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 h-11 border-border focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Enter your password"
                    aria-label="Password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-white text-pmu-blue border border-border hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Registration Link */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="font-medium text-pmu-gold hover:text-pmu-gold-dark transition-colors underline-offset-4 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

