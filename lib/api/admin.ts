export async function getAdminUsersApi() {
  const response = await fetch('/api/admin/users')
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to fetch users')
  }
  return data as { users: Array<Record<string, unknown>> }
}

