import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth'

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logout successful' }, { status: 200 })
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      ...authCookieOptions(),
      maxAge: 0,
    })
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
