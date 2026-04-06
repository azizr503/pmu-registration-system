import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createSessionToken,
  getCredentialByEmail,
  isValidPMUEmail,
  touchLastLogin,
  verifyPassword,
} from '@/lib/auth'
import { normalizePmuEmail } from '@/lib/email-normalize'

/** SQLite + bcrypt require the Node.js runtime (not Edge). */
export const runtime = 'nodejs'

const INACTIVE_MSG = 'Account not activated. Please contact IT Support.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string } | null
    const email = body?.email
    const password = body?.password

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const emailNorm = normalizePmuEmail(String(email))
    if (!isValidPMUEmail(emailNorm)) {
      return NextResponse.json(
        { error: 'Please use a valid PMU email address (@pmu.edu.sa)' },
        { status: 400 }
      )
    }

    let cred: { user: import('@/types/auth').AuthUser; password_hash: string } | null = null
    try {
      cred = getCredentialByEmail(emailNorm)
    } catch (dbErr) {
      console.error('Login DB error:', dbErr)
      return NextResponse.json(
        { error: 'Unable to reach the login service. Please try again shortly.' },
        { status: 503 }
      )
    }

    if (!cred) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (cred.user.status !== 'active') {
      return NextResponse.json({ error: INACTIVE_MSG }, { status: 403 })
    }

    let ok = false
    try {
      ok = await verifyPassword(String(password), cred.password_hash)
    } catch (e) {
      console.error('Login bcrypt error:', e)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    try {
      touchLastLogin(cred.user.id)
    } catch (e) {
      console.warn('touchLastLogin:', e)
    }

    let token: string
    try {
      token = await createSessionToken(cred.user)
    } catch (e) {
      console.error('Login JWT error:', e)
      return NextResponse.json({ error: 'Unable to complete sign-in. Please try again.' }, { status: 500 })
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: cred.user,
    })
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions())
    return response
  } catch (error) {
    console.error('Login route unexpected error:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 })
  }
}
