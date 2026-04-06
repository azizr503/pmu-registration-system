import bcrypt from 'bcrypt'
import type { NextRequest } from 'next/server'
import type { AuthUser, UserRole, UserStatus } from '@/types/auth'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth-cookie'
import { getDb } from '@/lib/db'
import { signAuthToken, verifyAuthToken, claimsToAuthUser } from '@/lib/jwt'
import { inferRoleFromEmail } from '@/lib/role-email'

export { AUTH_COOKIE_NAME, authCookieOptions, AUTH_SESSION_MAX_AGE_SEC } from '@/lib/auth-cookie'

function splitFullName(full: string): { firstName: string; lastName: string } {
  const t = full.trim()
  if (!t) return { firstName: '', lastName: '' }
  const parts = t.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function rowToAuthUser(row: {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  student_id: string | null
  faculty_id: string | null
  full_name: string | null
  profile_completed: number | null
}): AuthUser {
  const name = row.full_name || row.email.split('@')[0]
  const { firstName, lastName } = splitFullName(name)
  return {
    id: row.id,
    email: row.email,
    firstName,
    lastName,
    role: row.role,
    status: row.status,
    studentId: row.student_id ?? undefined,
    facultyId: row.faculty_id ?? undefined,
    profileCompleted: row.role === 'student' ? Boolean(row.profile_completed) : true,
  }
}

export function getAuthUserById(id: string): AuthUser | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status,
              s.student_id, s.full_name AS sname, s.profile_completed,
              f.faculty_id, f.full_name AS fname
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN faculty f ON f.user_id = u.id
       WHERE u.id = ?`
    )
    .get(id) as
    | {
        id: string
        email: string
        role: UserRole
        status: UserStatus
        student_id: string | null
        sname: string | null
        profile_completed: number | null
        faculty_id: string | null
        fname: string | null
      }
    | undefined

  if (!row) return null

  const full_name = row.sname || row.fname
  return rowToAuthUser({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    student_id: row.student_id,
    faculty_id: row.faculty_id,
    full_name,
    profile_completed: row.profile_completed,
  })
}

export function getCredentialByEmail(
  email: string
): { user: AuthUser; password_hash: string } | null {
  const db = getDb()
  const row = db
    .prepare(`SELECT id, password_hash FROM users WHERE lower(email) = lower(?)`)
    .get(email) as { id: string; password_hash: string } | undefined
  if (!row) return null
  const user = getAuthUserById(row.id)
  if (!user) return null
  return { user, password_hash: row.password_hash }
}

export function getAuthUserByEmail(email: string): AuthUser | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status,
              s.student_id, s.full_name AS sname, s.profile_completed,
              f.faculty_id, f.full_name AS fname
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN faculty f ON f.user_id = u.id
       WHERE lower(u.email) = lower(?)`
    )
    .get(email) as
    | {
        id: string
        email: string
        role: UserRole
        status: UserStatus
        student_id: string | null
        sname: string | null
        profile_completed: number | null
        faculty_id: string | null
        fname: string | null
      }
    | undefined

  if (!row) return null

  const full_name = row.sname || row.fname
  return rowToAuthUser({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    student_id: row.student_id,
    faculty_id: row.faculty_id,
    full_name,
    profile_completed: row.profile_completed,
  })
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return signAuthToken(user)
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  const claims = await verifyAuthToken(token)
  if (!claims) return null
  const fresh = getAuthUserById(claims.sub)
  if (!fresh || fresh.status !== 'active') return null
  return fresh
}

/** Same as getUserFromRequest but returns claims if DB row missing (edge) */
export async function getClaimsFromRequest(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  const claims = await verifyAuthToken(token)
  return claims
}

export function isValidPMUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@pmu.edu.sa')
}

export function touchLastLogin(userId: string) {
  const db = getDb()
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), userId)
}

export { verifyAuthToken, claimsToAuthUser, inferRoleFromEmail }
