import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

/** Legacy shape for existing components (student-profile, profile/complete). */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'Profile is only available for students' }, { status: 404 })
    }

    const db = getDb()
    const st = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(authUser.id) as
      | Record<string, unknown>
      | undefined

    if (!st) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const full = String(st.full_name || '')
    const parts = full.split(/\s+/)
    const firstName = parts[0] || authUser.firstName
    const lastName = parts.slice(1).join(' ') || authUser.lastName

    const completedCodes = db
      .prepare(
        `SELECT DISTINCT c.code FROM grades g
         JOIN sections s ON s.id = g.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE g.user_id = ? AND g.is_final = 1`
      )
      .all(authUser.id) as { code: string }[]

    const profile = {
      id: authUser.id,
      email: authUser.email,
      firstName,
      lastName,
      studentId: String(st.student_id),
      name: full,
      phone: st.phone ? String(st.phone) : undefined,
      address: undefined,
      major: st.major ? String(st.major) : undefined,
      minor: st.minor ? String(st.minor) : undefined,
      enrollmentDate: undefined,
      expectedGraduation: undefined,
      gpa: typeof st.gpa === 'number' ? st.gpa : Number(st.gpa) || 0,
      completedCredits: typeof st.credits_completed === 'number' ? st.credits_completed : Number(st.credits_completed) || 0,
      requiredCredits: 120,
      academicStanding: 'Good Standing',
      completedCourses: completedCodes.map(c => c.code),
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'Only students can update this profile' }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, major, minor } = body as Record<string, unknown>

    const full_name =
      typeof firstName === 'string' && typeof lastName === 'string'
        ? `${firstName.trim()} ${lastName.trim()}`.trim()
        : undefined

    const db = getDb()
    const cur = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(authUser.id) as Record<string, unknown> | undefined
    if (!cur) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    db.prepare(
      `UPDATE students SET
        full_name = COALESCE(?, full_name),
        major = COALESCE(?, major),
        minor = COALESCE(?, minor),
        phone = COALESCE(?, phone),
        profile_completed = 1
      WHERE user_id = ?`
    ).run(
      full_name ?? cur.full_name,
      typeof major === 'string' ? major : cur.major,
      typeof minor === 'string' ? minor : cur.minor,
      typeof phone === 'string' ? phone : cur.phone,
      authUser.id
    )

    void address
    void enrollmentTerm
    void expectedGraduation

    return NextResponse.json({
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
