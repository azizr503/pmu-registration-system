import type { AuthUser, UserRole } from '@/types/auth'

export const PUBLIC_ROUTES = ['/login', '/register'] as const

export function roleHomePath(role: UserRole): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'faculty') return '/faculty/dashboard'
  return '/student/dashboard'
}

/** Where to send the user immediately after a successful login. */
export function getPostLoginPath(user: AuthUser, requestedRedirect?: string | null): string {
  if (requestedRedirect && requestedRedirect !== '/' && !requestedRedirect.startsWith('/login')) {
    return requestedRedirect
  }
  if (user.role === 'student' && !user.profileCompleted) {
    return '/student/profile-setup'
  }
  return roleHomePath(user.role)
}
