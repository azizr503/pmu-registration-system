import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const settings = db.prepare(`SELECT * FROM registration_settings WHERE id = 1`).get() as {
      semester: string | null
      is_open: number
      start_date: string | null
      end_date: string | null
      max_credits: number
    } | null

    const semester = settings?.semester || 'Spring 2026'

    const stats = db
      .prepare(
        `SELECT semester, COUNT(*) as c FROM registrations WHERE status = 'registered' GROUP BY semester`
      )
      .all()

    const totalRegisteredThisSemester = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM registrations WHERE semester = ? AND status = 'registered'`
        )
        .get(semester) as { c: number }
    ).c

    const studentsNotRegistered = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM users u
           WHERE u.role = 'student'
             AND NOT EXISTS (
               SELECT 1 FROM registrations r
               WHERE r.user_id = u.id AND r.semester = ? AND r.status = 'registered'
             )`
        )
        .get(semester) as { c: number }
    ).c

    const popular = db
      .prepare(
        `SELECT c.code, c.title, s.enrolled_count
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.semester = ?
         ORDER BY s.enrolled_count DESC
         LIMIT 1`
      )
      .get(semester) as { code: string; title: string; enrolled_count: number } | undefined

    return NextResponse.json({
      settings,
      stats,
      analytics: {
        semester,
        totalRegisteredRowsThisSemester: totalRegisteredThisSemester,
        studentsWhoHaveNotRegistered: studentsNotRegistered,
        mostPopularCourse: popular
          ? { code: popular.code, title: popular.title, enrolled: popular.enrolled_count }
          : null,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { semester, is_open, start_date, end_date, max_credits } = body as {
      semester?: string
      is_open?: boolean
      start_date?: string
      end_date?: string
      max_credits?: number
    }

    const db = getDb()
    db.prepare(
      `UPDATE registration_settings SET
        semester = COALESCE(?, semester),
        is_open = COALESCE(?, is_open),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        max_credits = COALESCE(?, max_credits)
      WHERE id = 1`
    ).run(
      semester ?? null,
      typeof is_open === 'boolean' ? (is_open ? 1 : 0) : null,
      start_date ?? null,
      end_date ?? null,
      max_credits ?? null
    )

    const settings = db.prepare(`SELECT * FROM registration_settings WHERE id = 1`).get()
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
