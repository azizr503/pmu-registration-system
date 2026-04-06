import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createSessionToken,
  getUserFromRequest,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = await createSessionToken(user)
    const response = NextResponse.json({ user })
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions())
    return response
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
