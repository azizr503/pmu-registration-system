import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const st = db
      .prepare(
        `SELECT full_name, gpa, credits_completed, student_id FROM students WHERE user_id = ?`
      )
      .get(user.id) as
      | { full_name: string; gpa: number; credits_completed: number; student_id: string }
      | undefined

    const settings = db
      .prepare(`SELECT semester, is_open, max_credits FROM registration_settings WHERE id = 1`)
      .get() as { semester: string | null; is_open: number; max_credits: number } | undefined

    const announcements = db
      .prepare(
        `SELECT id, title, content, created_at FROM announcements
         WHERE target_role IN ('all','student') ORDER BY created_at DESC LIMIT 6`
      )
      .all() as { id: string; title: string; content: string; created_at: string }[]

    const required = 120
    const completed = st?.credits_completed ?? 0
    const remaining = Math.max(0, required - completed)
    const semester = settings?.semester ?? 'Spring 2026'

    const regRow = db
      .prepare(
        `SELECT SUM(c.credits) as s FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.user_id = ? AND r.semester = ? AND r.status = 'registered'`
      )
      .get(user.id, semester) as { s: number | null } | undefined
    const registeredCredits = regRow?.s ?? 0

    return NextResponse.json({
      student: {
        name: st?.full_name ?? `${user.firstName} ${user.lastName}`,
        studentId: st?.student_id ?? user.studentId,
        gpa: st?.gpa ?? 0,
        creditsCompleted: completed,
        registeredCredits,
        remainingHours: remaining,
        requiredCredits: required,
      },
      registration: {
        semester,
        isOpen: Boolean(settings?.is_open),
        maxCredits: settings?.max_credits ?? 18,
      },
      announcements,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
