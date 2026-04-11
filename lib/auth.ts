import bcrypt from 'bcrypt'
import type { AuthUser } from '@/types/auth'
import { signAuthToken, verifyAuthToken, claimsToAuthUser } from '@/lib/jwt'
import { inferRoleFromEmail } from '@/lib/role-email'

export { AUTH_COOKIE_NAME, authCookieOptions, AUTH_SESSION_MAX_AGE_SEC } from '@/lib/auth-cookie'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return signAuthToken(user)
}

export function isValidPMUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@pmu.edu.sa')
}

export { verifyAuthToken, claimsToAuthUser, inferRoleFromEmail }
