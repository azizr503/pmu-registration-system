import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, hashPassword, inferRoleFromEmail } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT u.id, u.email, u.role, u.status, u.last_login,
                s.student_id, s.full_name AS sname,
                f.faculty_id, f.full_name AS fname
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN faculty f ON f.user_id = u.id
         ORDER BY u.role, u.email`
      )
      .all() as {
      id: string
      email: string
      role: string
      status: string
      last_login: string | null
      student_id: string | null
      sname: string | null
      faculty_id: string | null
      fname: string | null
    }[]

    const users = rows.map(r => ({
      id: r.id,
      email: r.email,
      role: r.role,
      status: r.status,
      lastLogin: r.last_login,
      name: r.sname || r.fname || r.email.split('@')[0],
      externalId: r.student_id || r.faculty_id || (r.role === 'admin' ? 'admin' : ''),
    }))

    return NextResponse.json({ users })
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
    const { email, password, full_name, role } = body as {
      email: string
      password: string
      full_name: string
      role: 'student' | 'faculty' | 'admin'
    }

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const inferred = inferRoleFromEmail(email)
    if (inferred && inferred.role !== role) {
      return NextResponse.json({ error: 'Email pattern does not match selected role' }, { status: 400 })
    }
    if (role === 'student' && !inferred?.studentId) {
      return NextResponse.json(
        { error: 'Student accounts must use an email like s.XXXXXXX@pmu.edu.sa' },
        { status: 400 }
      )
    }
    if (role === 'faculty' && !inferred?.facultyId) {
      return NextResponse.json(
        { error: 'Faculty accounts must use an email like f.XXXXXXX@pmu.edu.sa' },
        { status: 400 }
      )
    }

    const db = getDb()
    const exists = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(email) as
      | { id: string }
      | undefined
    if (exists) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    const id = randomUUID()
    const hashed = await hashPassword(password)
    const now = new Date().toISOString()

    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
         VALUES (?, ?, ?, ?, 'active', ?, NULL)`
      ).run(id, email.trim().toLowerCase(), hashed, role, now)

      if (role === 'student' && inferred?.studentId) {
        db.prepare(
          `INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
           VALUES (?, ?, ?, '', '', 'Freshman', 0, 0, NULL, '', '', 0)`
        ).run(id, inferred.studentId, full_name.trim())
      } else if (role === 'faculty' && inferred?.facultyId) {
        db.prepare(
          `INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, courses_taught_history)
           VALUES (?, ?, ?, '', '', '', '', '[]')`
        ).run(id, inferred.facultyId, full_name.trim())
      }
    })
    run()

    return NextResponse.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
