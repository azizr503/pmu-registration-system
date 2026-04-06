export async function getProfileApi() {
  const response = await fetch('/api/profile')
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = (data as { error?: string }).error || 'Failed to load profile'
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return data as { profile: Record<string, unknown> }
}

export async function updateProfileApi(payload: Record<string, unknown>) {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to update profile')
  }
  return data
}

