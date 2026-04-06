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
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed')
  }
  return data
}

export async function loginApi(payload: LoginPayload) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseOrThrow(response)
}

export async function registerApi(payload: RegisterPayload) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseOrThrow(response)
}

export async function meApi() {
  const response = await fetch('/api/auth/me')
  return parseOrThrow(response)
}

export async function logoutApi() {
  const response = await fetch('/api/auth/logout', { method: 'POST' })
  return parseOrThrow(response)
}

