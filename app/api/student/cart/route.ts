import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  findTimeConflictWithSet,
  getRegistrationSettings,
  getSectionRow,
  listStudentSectionsForSemester,
  prereqMet,
} from '@/lib/student-helpers'

function formatSlot(days: string | null, start: string | null, end: string | null) {
  const d = days || ''
  const t = start && end ? `${start}-${end}` : ''
  return `${d} ${t}`.trim()
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester')
    if (!semester) {
      return NextResponse.json({ error: 'semester is required' }, { status: 400 })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT r.id, r.section_id, r.semester, r.status, s.days, s.start_time, s.end_time, s.room,
                c.code AS course_code, c.title AS course_title, c.credits, c.id AS course_id
         FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.user_id = ? AND r.semester = ? AND r.status = 'cart'
         ORDER BY c.code`
      )
      .all(user.id, semester) as {
      id: string
      section_id: string
      semester: string
      status: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      course_code: string
      course_title: string
      credits: number
      course_id: string
    }[]

    const totalCredits = rows.reduce((s, r) => s + r.credits, 0)
    const settings = getRegistrationSettings(db)
    const maxCredits = settings?.max_credits ?? 18

    return NextResponse.json({
      items: rows,
      totalCredits,
      maxCredits,
      overLimit: totalCredits > maxCredits,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const sectionId = body.sectionId as string
    let semester = body.semester as string | undefined
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId required' }, { status: 400 })
    }

    const db = getDb()
    const settings = getRegistrationSettings(db)
    if (!settings?.is_open) {
      return NextResponse.json({ ok: false, code: 'CLOSED', message: 'Registration is closed for this period.' })
    }
    if (!semester) semester = settings.semester || undefined
    if (!semester) {
      return NextResponse.json({ error: 'semester required' }, { status: 400 })
    }

    const sec = getSectionRow(db, sectionId)
    if (!sec || sec.semester !== semester) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const dupCourse = db
      .prepare(
        `SELECT c.code FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.user_id = ? AND r.semester = ? AND r.status IN ('cart','registered')
           AND s.course_id = ? AND r.section_id != ?`
      )
      .get(user.id, semester, sec.course_id, sectionId) as { code: string } | undefined

    if (dupCourse) {
      return NextResponse.json({
        ok: false,
        code: 'DUPLICATE_COURSE',
        message: `You already have ${dupCourse.code} in your schedule for this semester.`,
      })
    }

    const prereq = prereqMet(db, user.id, sec.course_id)
    if (!prereq.ok) {
      return NextResponse.json({
        ok: false,
        code: 'PREREQ',
        message: `Prerequisite not met: ${prereq.missing.join(', ')} required`,
        missing: prereq.missing,
      })
    }

    const existingRows = listStudentSectionsForSemester(db, user.id, semester, ['cart', 'registered'])
    const existing = existingRows.map(r => ({
      id: r.id,
      semester: r.semester,
      days: r.days,
      start_time: r.start_time,
      end_time: r.end_time,
      course_code: r.course_code,
    }))

    const cand = {
      id: sec.id,
      semester: sec.semester,
      days: sec.days,
      start_time: sec.start_time,
      end_time: sec.end_time,
      course_code: sec.course_code,
    }

    const tc = findTimeConflictWithSet(cand, existing)
    if (tc.conflict && tc.withCode) {
      const other = existingRows.find(x => x.course_code === tc.withCode)
      return NextResponse.json({
        ok: false,
        code: 'CONFLICT',
        message: `Time conflict with ${tc.withCode} (${formatSlot(other?.days ?? null, other?.start_time ?? null, other?.end_time ?? null)})`,
      })
    }

    const sumCredits = existingRows.reduce((s, r) => s + r.credits, 0) + sec.credits

    if (sumCredits > (settings.max_credits ?? 18)) {
      return NextResponse.json({
        ok: false,
        code: 'CREDITS',
        message: `Adding this course would exceed the maximum of ${settings.max_credits ?? 18} credit hours.`,
      })
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO registrations (id, user_id, section_id, semester, status, registered_at, attendance_pct)
       VALUES (?, ?, ?, ?, 'cart', ?, 100)
       ON CONFLICT(user_id, section_id, semester) DO UPDATE SET status = 'cart', registered_at = excluded.registered_at`
    ).run(id, user.id, sectionId, semester, now)

    return NextResponse.json({ ok: true, code: 'ADDED', message: 'Added successfully' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')
    const semester = searchParams.get('semester')
    if (!sectionId || !semester) {
      return NextResponse.json({ error: 'sectionId and semester required' }, { status: 400 })
    }

    const db = getDb()
    db.prepare(
      `DELETE FROM registrations WHERE user_id = ? AND section_id = ? AND semester = ? AND status = 'cart'`
    ).run(user.id, sectionId, semester)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
