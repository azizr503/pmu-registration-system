export const AUTH_COOKIE_NAME = 'auth-token'
export const AUTH_SESSION_MAX_AGE_SEC = 30 * 60

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    path: '/',
  }
}
