import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const settings = db.prepare(`SELECT semester FROM registration_settings WHERE id = 1`).get() as
      | { semester: string | null }
      | undefined
    const semester = settings?.semester || 'Spring 2026'

    const fac = db
      .prepare(`SELECT full_name FROM faculty WHERE user_id = ?`)
      .get(user.id) as { full_name: string } | undefined

    const sections = db
      .prepare(
        `SELECT s.id, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.code, c.title
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.faculty_user_id = ? AND s.semester = ?
         ORDER BY c.code`
      )
      .all(user.id, semester) as {
      id: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      capacity: number
      enrolled_count: number
      code: string
      title: string
    }[]

    const pendingGrades = db
      .prepare(
        `SELECT COUNT(*) as c FROM grades g
         JOIN sections s ON s.id = g.section_id
         WHERE s.faculty_user_id = ? AND g.is_final = 0`
      )
      .get(user.id) as { c: number }

    const totalStudents = db
      .prepare(
        `SELECT COUNT(DISTINCT r.user_id) as c FROM registrations r
         JOIN sections s ON s.id = r.section_id
         WHERE s.faculty_user_id = ? AND r.semester = ? AND r.status = 'registered'`
      )
      .get(user.id, semester) as { c: number }

    return NextResponse.json({
      semester,
      facultyName: fac?.full_name ?? 'Faculty',
      sections,
      stats: {
        coursesThisSemester: sections.length,
        totalStudents: totalStudents?.c ?? 0,
        pendingGradeSubmissions: pendingGrades?.c ?? 0,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
