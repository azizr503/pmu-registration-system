import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sectionId } = await context.params
    const db = getDb()
    const sec = db
      .prepare(`SELECT id, faculty_user_id FROM sections WHERE id = ?`)
      .get(sectionId) as { id: string; faculty_user_id: string | null } | undefined
    if (!sec || sec.faculty_user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const q = (new URL(request.url).searchParams.get('q') || '').toLowerCase()

    const rows = db
      .prepare(
        `SELECT s.student_id, s.full_name, u.email, r.attendance_pct,
                g.override_grade, g.letter_grade, g.calculated_grade
         FROM registrations r
         JOIN students s ON s.user_id = r.user_id
         JOIN users u ON u.id = r.user_id
         LEFT JOIN grades g ON g.user_id = r.user_id AND g.section_id = r.section_id
         WHERE r.section_id = ? AND r.status = 'registered'`
      )
      .all(sectionId) as {
      student_id: string
      full_name: string
      email: string
      attendance_pct: number | null
      override_grade: string | null
      letter_grade: string | null
      calculated_grade: number | null
    }[]

    const filtered = q
      ? rows.filter(
          r =>
            r.student_id.toLowerCase().includes(q) ||
            r.full_name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        )
      : rows

    return NextResponse.json({
      students: filtered.map(r => ({
        studentId: r.student_id,
        name: r.full_name,
        email: r.email,
        attendancePct: r.attendance_pct ?? 0,
        currentGrade: r.override_grade || r.letter_grade || (r.calculated_grade != null ? String(r.calculated_grade) : '—'),
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
