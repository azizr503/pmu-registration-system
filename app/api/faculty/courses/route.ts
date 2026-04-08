import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semester =
      searchParams.get('semester') ||
      (
        getDb().prepare(`SELECT semester FROM registration_settings WHERE id = 1`).get() as {
          semester: string | null
        } | null
      )?.semester ||
      'Spring 2026'

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT s.id, s.semester, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.code, c.title,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM grades g
                    WHERE g.section_id = s.id AND g.is_final = 1
                  ) THEN 1 ELSE 0
                END AS grades_submitted
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.faculty_user_id = ? AND s.semester = ?
         ORDER BY c.code`
      )
      .all(user.id, semester) as {
      id: string
      semester: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      capacity: number
      enrolled_count: number
      code: string
      title: string
      grades_submitted: number
    }[]

    return NextResponse.json({ semester, courses: rows })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
