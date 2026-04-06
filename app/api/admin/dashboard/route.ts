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
    const students = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'student'`).get() as { c: number }
    const faculty = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'faculty'`).get() as { c: number }
    const activeRegs = db
      .prepare(`SELECT COUNT(*) as c FROM registrations WHERE status = 'registered'`)
      .get() as { c: number }
    const openCourses = db.prepare(`SELECT COUNT(*) as c FROM sections`).get() as { c: number }

    return NextResponse.json({
      stats: {
        totalStudents: students.c,
        totalFaculty: faculty.c,
        activeRegistrations: activeRegs.c,
        openCourses: openCourses.c,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
