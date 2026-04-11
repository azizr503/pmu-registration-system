import type { Response } from 'express'
import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE_SEC } from '@/lib/auth-cookie'

/** Express `res.cookie` maxAge is milliseconds; Next.js auth uses seconds in auth-cookie. */
export function attachAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: AUTH_SESSION_MAX_AGE_SEC * 1000,
  })
}

export function clearAuthCookie(res: Response) {
  res.cookie(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}
