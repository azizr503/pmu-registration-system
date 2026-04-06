import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { numericToLetter, weightedGrade } from '@/lib/faculty-grade'

const WEIGHTS = { mid: 0.3, fin: 0.5, asg: 0.2 }

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sectionId } = await context.params
    const db = getDb()
    const sec = db
      .prepare(`SELECT id, faculty_user_id FROM sections WHERE id = ?`)
      .get(sectionId) as { id: string; faculty_user_id: string | null } | undefined
    if (!sec || sec.faculty_user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const rows = db
      .prepare(
        `SELECT s.student_id, s.full_name, u.id AS user_id,
                g.midterm, g.final, g.assignment, g.calculated_grade, g.override_grade, g.letter_grade, g.is_final
         FROM registrations r
         JOIN students s ON s.user_id = r.user_id
         JOIN users u ON u.id = r.user_id
         LEFT JOIN grades g ON g.user_id = r.user_id AND g.section_id = r.section_id
         WHERE r.section_id = ? AND r.status = 'registered'
         ORDER BY s.student_id`
      )
      .all(sectionId) as {
      student_id: string
      full_name: string
      user_id: string
      midterm: number | null
      final: number | null
      assignment: number | null
      calculated_grade: number | null
      override_grade: string | null
      letter_grade: string | null
      is_final: number | null
    }[]

    return NextResponse.json({
      weights: WEIGHTS,
      locked: rows.some(r => r.is_final === 1),
      rows: rows.map(r => {
        const calc =
          r.midterm != null && r.final != null && r.assignment != null
            ? weightedGrade(r.midterm, r.final, r.assignment, WEIGHTS)
            : r.calculated_grade
        return {
          studentId: r.student_id,
          name: r.full_name,
          userId: r.user_id,
          midterm: r.midterm,
          final: r.final,
          assignment: r.assignment,
          calculatedGrade: calc != null ? Math.round(calc * 100) / 100 : null,
          letterGrade: r.letter_grade,
          overrideGrade: r.override_grade,
          isFinal: Boolean(r.is_final),
        }
      }),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sectionId } = await context.params
    const body = await request.json()
    const action = body.action as 'draft' | 'final'
    const grades = body.grades as {
      userId: string
      midterm: number | null
      final: number | null
      assignment: number | null
      overrideGrade?: string | null
    }[]

    if (!Array.isArray(grades)) {
      return NextResponse.json({ error: 'grades array required' }, { status: 400 })
    }

    const db = getDb()
    const sec = db
      .prepare(`SELECT id, faculty_user_id FROM sections WHERE id = ?`)
      .get(sectionId) as { id: string; faculty_user_id: string | null } | undefined
    if (!sec || sec.faculty_user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const isFinal = action === 'final' ? 1 : 0

    const insert = db.prepare(
      `INSERT INTO grades (id, user_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const update = db.prepare(
      `UPDATE grades SET
        midterm = ?, final = ?, assignment = ?, calculated_grade = ?, override_grade = ?, letter_grade = ?, submitted_at = ?, is_final = ?
       WHERE id = ?`
    )

    const run = db.transaction(() => {
      for (const g of grades) {
        const calc =
          g.midterm != null && g.final != null && g.assignment != null
            ? weightedGrade(g.midterm, g.final, g.assignment, WEIGHTS)
            : null
        const letter =
          g.overrideGrade && g.overrideGrade.trim()
            ? g.overrideGrade.trim()
            : calc != null
              ? numericToLetter(calc)
              : null

        const existing = db
          .prepare(`SELECT id, is_final FROM grades WHERE user_id = ? AND section_id = ?`)
          .get(g.userId, sectionId) as { id: string; is_final: number } | undefined
        if (existing?.is_final === 1 && action === 'draft') {
          continue
        }

        if (existing) {
          update.run(
            g.midterm,
            g.final,
            g.assignment,
            calc,
            g.overrideGrade ?? null,
            letter,
            now,
            isFinal,
            existing.id
          )
        } else {
          insert.run(
            randomUUID(),
            g.userId,
            sectionId,
            g.midterm,
            g.final,
            g.assignment,
            calc,
            g.overrideGrade ?? null,
            letter,
            now,
            isFinal
          )
        }
      }
    })
    run()

    return NextResponse.json({ ok: true, locked: isFinal === 1 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
