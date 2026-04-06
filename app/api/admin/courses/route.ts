import { randomUUID } from 'crypto'
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
    const courses = db.prepare(`SELECT * FROM courses ORDER BY code`).all()
    const sections = db
      .prepare(
        `SELECT s.*, c.code AS course_code, u.email AS faculty_email, f.full_name AS faculty_name
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         LEFT JOIN users u ON u.id = s.faculty_user_id
         LEFT JOIN faculty f ON f.user_id = s.faculty_user_id
         ORDER BY s.semester DESC, c.code`
      )
      .all()

    return NextResponse.json({ courses, sections })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const kind = body.kind as 'course' | 'section'

    const db = getDb()

    if (kind === 'course') {
      const { code, title, credits, department, description, prerequisites } = body as {
        code: string
        title: string
        credits: number
        department?: string
        description?: string
        prerequisites?: string[]
      }
      if (!code || !title || credits == null) {
        return NextResponse.json({ error: 'code, title, credits required' }, { status: 400 })
      }
      const id = randomUUID()
      const prereq = JSON.stringify(prerequisites ?? [])
      db.prepare(
        `INSERT INTO courses (id, code, title, credits, department, description, prerequisites)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, code, title, credits, department ?? '', description ?? '', prereq)
      return NextResponse.json({ ok: true, id })
    }

    if (kind === 'section') {
      const {
        course_id,
        faculty_user_id,
        semester,
        days,
        start_time,
        end_time,
        room,
        capacity,
      } = body as {
        course_id: string
        faculty_user_id: string | null
        semester: string
        days: string
        start_time: string
        end_time: string
        room: string
        capacity: number
      }
      if (!course_id || !semester) {
        return NextResponse.json({ error: 'course_id and semester required' }, { status: 400 })
      }
      const id = randomUUID()
      db.prepare(
        `INSERT INTO sections (id, course_id, faculty_user_id, semester, days, start_time, end_time, room, capacity, enrolled_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(
        id,
        course_id,
        faculty_user_id || null,
        semester,
        days ?? '',
        start_time ?? '',
        end_time ?? '',
        room ?? '',
        capacity ?? 40
      )
      return NextResponse.json({ ok: true, id })
    }

    return NextResponse.json({ error: 'kind must be course or section' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
