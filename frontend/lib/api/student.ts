import { apiUrl } from '@/lib/api-base'

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed')
  }
  return data
}

export async function getStudentOverview() {
  const r = await fetch(apiUrl('/student/overview'), { credentials: 'include' })
  return parseOrThrow(r) as {
    student: {
      name: string
      studentId: string
      major: string | null
      gpa: number
      creditsCompleted: number
      registeredCredits: number
      remainingHours: number
      requiredCredits: number
    }
    registration: { semester: string; isOpen: boolean; maxCredits: number }
    announcements: { id: string; title: string; content: string; created_at: string }[]
  }
}

export async function getStudentSections(semester: string, q?: string) {
  const u = new URL(apiUrl('/student/sections'))
  u.searchParams.set('semester', semester)
  if (q) u.searchParams.set('q', q)
  const r = await fetch(u.toString(), { credentials: 'include' })
  return parseOrThrow(r) as { sections: Record<string, unknown>[] }
}

export async function getStudentCart(semester: string) {
  const u = new URL(apiUrl('/student/cart'))
  u.searchParams.set('semester', semester)
  const r = await fetch(u.toString(), { credentials: 'include' })
  return parseOrThrow(r) as {
    items: Record<string, unknown>[]
    totalCredits: number
    maxCredits: number
    overLimit: boolean
  }
}

export async function postStudentCart(sectionId: string, semester: string) {
  const r = await fetch(apiUrl('/student/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId, semester }),
    credentials: 'include',
  })
  return r.json()
}

export async function deleteStudentCart(sectionId: string, semester: string) {
  const u = new URL(apiUrl('/student/cart'))
  u.searchParams.set('sectionId', sectionId)
  u.searchParams.set('semester', semester)
  const r = await fetch(u.toString(), { method: 'DELETE', credentials: 'include' })
  return parseOrThrow(r)
}

export async function confirmRegistration(semester: string) {
  const r = await fetch(apiUrl('/student/registration/confirm'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ semester }),
    credentials: 'include',
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || 'Confirm failed')
  return data
}

export async function getStudentSchedule(semester: string) {
  const u = new URL(apiUrl('/student/schedule'))
  u.searchParams.set('semester', semester)
  const r = await fetch(u.toString(), { credentials: 'include' })
  return parseOrThrow(r) as {
    semester: string
    totalCredits: number
    sections: {
      id: string
      course_code: string
      course_title: string
      credits: number
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      instructor_name: string | null
    }[]
    conflicts: { a: string; b: string; courseA: string; courseB: string }[]
  }
}

export async function getStudentGrades() {
  const r = await fetch(apiUrl('/student/grades'), { credentials: 'include' })
  return parseOrThrow(r) as Record<string, unknown>
}

export async function putStudentProfile(body: Record<string, unknown>) {
  const r = await fetch(apiUrl('/student/profile'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || 'Save failed')
  return data as { user?: import('@/types/auth').AuthUser }
}
