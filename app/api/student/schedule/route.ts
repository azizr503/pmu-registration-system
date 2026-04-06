import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sectionsTimeConflict } from '@/lib/schedule-utils'
import { getRegistrationSettings, listStudentSectionsForSemester } from '@/lib/student-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester')
    if (!semester) {
      return NextResponse.json({ error: 'semester required' }, { status: 400 })
    }

    const db = getDb()
    const settings = getRegistrationSettings(db)

    const list = listStudentSectionsForSemester(db, user.id, semester, ['registered'])
    const rows = list.map(r => ({
      id: r.id,
      course_code: r.course_code,
      course_title: r.course_title,
      credits: r.credits,
      days: r.days,
      start_time: r.start_time,
      end_time: r.end_time,
      room: (r as { room?: string | null }).room ?? null,
      semester: r.semester,
      instructor_name: r.instructor_name,
    }))

    const conflicts: { a: string; b: string; courseA: string; courseB: string }[] = []
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (
          sectionsTimeConflict(
            {
              semester: list[i].semester,
              days: list[i].days,
              start_time: list[i].start_time,
              end_time: list[i].end_time,
            },
            {
              semester: list[j].semester,
              days: list[j].days,
              start_time: list[j].start_time,
              end_time: list[j].end_time,
            }
          )
        ) {
          conflicts.push({
            a: list[i].id,
            b: list[j].id,
            courseA: list[i].course_code,
            courseB: list[j].course_code,
          })
        }
      }
    }

    const totalCredits = rows.reduce((s, r) => s + r.credits, 0)

    return NextResponse.json({
      semester,
      maxCredits: settings?.max_credits ?? 18,
      totalCredits,
      sections: rows,
      conflicts,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
