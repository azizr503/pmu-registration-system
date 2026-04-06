import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword, inferRoleFromEmail, isValidPMUEmail } from '@/lib/auth'
import { normalizePmuEmail } from '@/lib/email-normalize'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const emailNorm = normalizePmuEmail(email)
    if (!isValidPMUEmail(emailNorm)) {
      return NextResponse.json(
        { error: 'Please use a valid PMU email address (@pmu.edu.sa)' },
        { status: 400 }
      )
    }

    const inferred = inferRoleFromEmail(emailNorm)
    if (!inferred || inferred.role !== 'student' || !inferred.studentId) {
      return NextResponse.json(
        {
          error:
            'Self-registration is only available for PMU student IDs (s.XXXXXXX@pmu.edu.sa). Faculty and staff accounts are created by IT.',
        },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(emailNorm) as
      | { id: string }
      | undefined
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const id = randomUUID()
    const hashedPassword = await hashPassword(password)
    const now = new Date().toISOString()
    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim()

    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
         VALUES (?, ?, ?, 'student', 'inactive', ?, NULL)`
      ).run(id, emailNorm, hashedPassword, now)

      db.prepare(
        `INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
         VALUES (?, ?, ?, 'Undeclared', '', 'Freshman', 0, 0, NULL, '', '', 0)`
      ).run(id, inferred.studentId, fullName)
    })
    run()

    return NextResponse.json(
      {
        message:
          'Registration received. Your account must be activated by an administrator before you can sign in.',
        pendingActivation: true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
