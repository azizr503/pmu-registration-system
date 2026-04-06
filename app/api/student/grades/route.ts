import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { letterToPoints } from '@/lib/grade-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const st = db
      .prepare(`SELECT credits_completed, gpa FROM students WHERE user_id = ?`)
      .get(user.id) as { credits_completed: number; gpa: number } | undefined

    const rows = db
      .prepare(
        `SELECT g.id, g.midterm, g.final, g.assignment, g.calculated_grade, g.override_grade, g.letter_grade,
                s.semester, c.code, c.title, c.credits
         FROM grades g
         JOIN sections s ON s.id = g.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE g.user_id = ? AND g.is_final = 1
         ORDER BY s.semester DESC, c.code`
      )
      .all(user.id) as {
      id: string
      midterm: number | null
      final: number | null
      assignment: number | null
      calculated_grade: number | null
      override_grade: string | null
      letter_grade: string | null
      semester: string
      code: string
      title: string
      credits: number
    }[]

    const bySemester = new Map<string, typeof rows>()
    for (const r of rows) {
      const list = bySemester.get(r.semester) ?? []
      list.push(r)
      bySemester.set(r.semester, list)
    }

    const semesterGpas: { semester: string; gpa: number; credits: number }[] = []
    for (const [sem, list] of bySemester) {
      let pts = 0
      let cr = 0
      for (const x of list) {
        const letter = x.override_grade || x.letter_grade || ''
        const p = letterToPoints(letter)
        pts += p * x.credits
        cr += x.credits
      }
      semesterGpas.push({ semester: sem, gpa: cr ? pts / cr : 0, credits: cr })
    }

    let cumPts = 0
    let cumCr = 0
    for (const r of rows) {
      const letter = r.override_grade || r.letter_grade || ''
      cumPts += letterToPoints(letter) * r.credits
      cumCr += r.credits
    }
    const cumulativeGpa = cumCr ? cumPts / cumCr : 0

    const required = 120
    const completed = st?.credits_completed ?? cumCr

    return NextResponse.json({
      rows,
      semesters: Array.from(bySemester.keys()),
      semesterGpas,
      cumulativeGpa,
      creditsCompleted: completed,
      creditsRequired: required,
      storedGpa: st?.gpa ?? cumulativeGpa,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
