import { apiUrl } from '@/lib/api-base'

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  firstName: string
  lastName: string
  email: string
  password: string
}

async function parseOrThrow(response: Response) {
  const raw = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    if (!response.ok) {
      const hint =
        response.status === 404
          ? ' API route not found — is Express on :5001 running and Next /__pmu_backend rewrite enabled?'
          : ''
      throw new Error(
        `HTTP ${response.status} ${response.statusText}${raw ? `: ${raw.slice(0, 200)}` : ''}${hint}`
      )
    }
    throw new Error('Invalid JSON from server')
  }
  if (!response.ok) {
    const err = typeof data.error === 'string' ? data.error : null
    throw new Error(err || `Request failed (${response.status})`)
  }
  return data
}

export async function loginApi(payload: LoginPayload) {
  const response = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  })
  return parseOrThrow(response)
}

export async function registerApi(payload: RegisterPayload) {
  const response = await fetch(apiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  })
  return parseOrThrow(response)
}

export async function meApi() {
  const response = await fetch(apiUrl('/auth/me'), { credentials: 'include' })
  return parseOrThrow(response)
}

export async function logoutApi() {
  const response = await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' })
  return parseOrThrow(response)
}
