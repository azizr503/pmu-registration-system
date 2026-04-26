import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser, UserRole, UserStatus } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'pmu-dev-jwt-secret-change-in-production'

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET)
}

export type JwtClaims = {
  sub: string
  email: string
  role: UserRole
  firstName: string
  lastName: string
  studentId?: string
  facultyId?: string
  profileCompleted: boolean
  status: UserStatus
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  const body: Record<string, unknown> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    profileCompleted: user.profileCompleted,
    status: user.status,
  }
  if (user.studentId) body.studentId = user.studentId
  if (user.facultyId) body.facultyId = user.facultyId

  return new SignJWT(body)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getSecretKey())
}

export async function verifyAuthToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as unknown as JwtClaims
  } catch {
    return null
  }
}

export function claimsToAuthUser(claims: JwtClaims): AuthUser {
  const pc = claims.profileCompleted
  return {
    id: claims.sub,
    email: claims.email,
    firstName: claims.firstName,
    lastName: claims.lastName,
    role: claims.role,
    status: claims.status,
    studentId: claims.studentId,
    facultyId: claims.facultyId,
    profileCompleted: typeof pc === 'boolean' ? pc : Boolean(pc),
  }
}

/** Sliding session: re-sign the same claims with a fresh 30m expiry. */
export async function rotateAuthToken(token: string): Promise<string | null> {
  const c = await verifyAuthToken(token)
  if (!c) return null
  return signAuthToken(claimsToAuthUser(c))
}
