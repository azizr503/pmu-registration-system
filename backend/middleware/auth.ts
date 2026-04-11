import type { Request, Response, NextFunction } from 'express'
import type { AuthUser, UserRole } from '@/types/auth'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'
import { verifyAuthToken } from '@/lib/jwt'
import { getAuthUserById } from '../auth/user-service'

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser
    }
  }
}

function readBearer(req: Request): string | null {
  const h = req.headers.authorization
  if (h?.startsWith('Bearer ')) return h.slice(7).trim() || null
  return null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || readBearer(req)
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    const claims = await verifyAuthToken(token)
    if (!claims) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    const fresh = getAuthUserById(claims.sub)
    if (!fresh || fresh.status !== 'active') {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    req.authUser = fresh
    return next()
  } catch (e) {
    console.error('requireAuth:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = req.authUser
    if (!u || !roles.includes(u.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
