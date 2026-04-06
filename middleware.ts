import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PUBLIC_ROUTES } from '@/lib/constants/navigation'

// Routes that should redirect authenticated users (public routes)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the route is public (doesn't require authentication)
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  
  // Get the auth token
  const token = request.cookies.get('auth-token')?.value
  
  // If accessing a public route with a valid token, redirect to home
  if (isPublicRoute && token) {
    try {
      // Basic token validation (just check if it exists and is not empty)
      if (token.trim()) {
        const homeUrl = new URL('/', request.url)
        return NextResponse.redirect(homeUrl)
      }
    } catch {
      // Token is invalid, continue to auth page
    }
  }
  
  // If accessing any route that's not public without a token, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (e.g. png/jpg/css/js/fonts)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?|ttf|eot)).*)',
  ],
}
