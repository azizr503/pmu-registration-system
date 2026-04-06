import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthToken, rotateAuthToken } from '@/lib/jwt'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth-cookie'
import { roleHomePath } from '@/lib/constants/navigation'
import type { UserRole } from '@/types/auth'

const PUBLIC_PREFIXES = ['/login', '/register']

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function homeForClaims(claims: { role: string; profileCompleted?: boolean | number }) {
  const pc =
    typeof claims.profileCompleted === 'boolean'
      ? claims.profileCompleted
      : Boolean(claims.profileCompleted)
  if (claims.role === 'student' && !pc) {
    return '/student/profile-setup'
  }
  return roleHomePath(claims.role as UserRole)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value

  // Public landing: guests see Banner-style home; signed-in users go to their portal
  if (pathname === '/') {
    if (token) {
      const claims = await verifyAuthToken(token)
      if (claims) {
        return NextResponse.redirect(new URL(homeForClaims(claims), request.url))
      }
    }
    return NextResponse.next()
  }

  if (isPublic(pathname)) {
    if (token) {
      const claims = await verifyAuthToken(token)
      if (claims) {
        return NextResponse.redirect(new URL(homeForClaims(claims), request.url))
      }
    }
    return NextResponse.next()
  }

  if (!token) {
    const login = new URL('/login', request.url)
    login.searchParams.set('redirect', pathname)
    return NextResponse.redirect(login)
  }

  const claims = await verifyAuthToken(token)
  if (!claims) {
    const login = new URL('/login', request.url)
    login.searchParams.set('redirect', pathname)
    return NextResponse.redirect(login)
  }

  const role = claims.role as UserRole

  if (pathname.startsWith('/student')) {
    if (role !== 'student') {
      return NextResponse.redirect(new URL(roleHomePath(role), request.url))
    }
    if (
      !pathname.startsWith('/student/profile-setup') &&
      !claims.profileCompleted &&
      role === 'student'
    ) {
      return NextResponse.redirect(new URL('/student/profile-setup', request.url))
    }
  }

  if (pathname.startsWith('/faculty') && role !== 'faculty') {
    return NextResponse.redirect(new URL(roleHomePath(role), request.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(roleHomePath(role), request.url))
  }

  const rotated = await rotateAuthToken(token)
  const res = NextResponse.next()
  if (rotated) {
    res.cookies.set(AUTH_COOKIE_NAME, rotated, authCookieOptions())
  }
  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?|ttf|eot)).*)',
  ],
}
