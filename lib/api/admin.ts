import { apiUrl } from '@/lib/api-base'

export async function getAdminUsersApi() {
  const response = await fetch(apiUrl('/admin/users'), { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to fetch users')
  }
  return data as { users: Array<Record<string, unknown>> }
}
