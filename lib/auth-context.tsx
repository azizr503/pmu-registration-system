"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AuthUser } from '@/types/auth'
import { loginApi, logoutApi, meApi } from '@/lib/api/auth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ user: AuthUser }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const userData = await meApi()
      setUser(userData.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const data = (await loginApi({ email, password })) as { user: AuthUser }
    setUser(data.user)
    return data
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshUser()
    }, 9 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
