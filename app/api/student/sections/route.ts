import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester') || ''
    const q = (searchParams.get('q') || '').toLowerCase()
    const dept = (searchParams.get('department') || '').toLowerCase()

    if (!semester) {
      return NextResponse.json({ error: 'semester is required' }, { status: 400 })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT s.id, s.semester, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.id AS course_id, c.code, c.title, c.credits, c.department,
                f.full_name AS instructor_name
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         LEFT JOIN faculty f ON f.user_id = s.faculty_user_id
         WHERE s.semester = ?
         ORDER BY c.code, s.id`
      )
      .all(semester) as {
      id: string
      semester: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      capacity: number
      enrolled_count: number
      course_id: string
      code: string
      title: string
      credits: number
      department: string | null
      instructor_name: string | null
    }[]

    const filtered = rows.filter(r => {
      if (dept && (r.department || '').toLowerCase() !== dept) return false
      if (!q) return true
      const blob = `${r.code} ${r.title} ${r.department || ''} ${r.instructor_name || ''}`.toLowerCase()
      return blob.includes(q)
    })

    return NextResponse.json({ sections: filtered })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
