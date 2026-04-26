import type { UserRole } from '@/types/auth'

type InferResult = { role: UserRole; studentId?: string; facultyId?: string }

function parseEmailLocalPart(email: string): string {
  const parts = email.trim().toLowerCase().split('@')
  return parts[0] ?? ''
}

/** Infer role from PMU email pattern. */
export function inferRoleFromEmail(email: string): InferResult | null {
  const e = email.trim().toLowerCase()
  if (!e.endsWith('@pmu.edu.sa')) return null
  if (e === 'admin@pmu.edu.sa') return { role: 'admin' }

  const local = parseEmailLocalPart(e)
  if (local.startsWith('s.')) {
    return { role: 'student', studentId: local.slice(2) }
  }
  if (local.startsWith('f.')) {
    return { role: 'faculty', facultyId: local.slice(2) }
  }
  return null
}
