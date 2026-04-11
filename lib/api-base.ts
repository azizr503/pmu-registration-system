/**
 * Browser: always use same-origin `/__pmu_backend` (next.config rewrite → Express) so auth cookies
 * stay on the Next host. Do not set NEXT_PUBLIC_BACKEND_URL in .env.local for local dev.
 *
 * Server-side (no window): call Express directly for any future SSR fetches.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/__pmu_backend`
  }
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ||
    process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '') ||
    'http://127.0.0.1:5001'
  )
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getApiBase()}${p}`
}
