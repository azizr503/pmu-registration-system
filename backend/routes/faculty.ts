import { randomUUID } from 'crypto'
import { Router } from 'express'
import { createSessionToken } from '@/lib/auth'
import { numericToLetter, weightedGrade } from '@/lib/faculty-grade'
import { getAuthUserById } from '../auth/user-service'
import { attachAuthCookie } from '../cookies'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'

const WEIGHTS = { mid: 0.4, fin: 0.4, asg: 0.2 }

export const facultyRouter = Router()
facultyRouter.use(requireAuth)
facultyRouter.use(requireRole('faculty'))

facultyRouter.get('/courses', (req, res) => {
  try {
    const user = req.authUser!
    const db = getDb()
    const semester =
      String(req.query.semester || '') ||
      (
        db.prepare(`SELECT semester_label AS semester FROM registration_settings WHERE id = 1`).get() as {
          semester: string | null
        } | null
      )?.semester ||
      'Spring 2026'

    const rows = db
      .prepare(
        `SELECT s.id, s.semester, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.code, c.title,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM grades g
                    WHERE g.section_id = s.id AND g.is_final = 1
                  ) THEN 1 ELSE 0
                END AS grades_submitted
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.faculty_id = ? AND s.semester = ?
         ORDER BY c.code`
      )
      .all(user.id, semester) as {
      id: string
      semester: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      capacity: number
      enrolled_count: number
      code: string
      title: string
      grades_submitted: number
    }[]

    return res.json({ semester, courses: rows })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.get('/roster/:sectionId', (req, res) => {
  try {
    const user = req.authUser!
    const { sectionId } = req.params
    const db = getDb()
    const sec = db
      .prepare(
        `SELECT s.id, s.faculty_id, s.semester, c.code, c.title
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.id = ?`
      )
      .get(sectionId) as
      | {
          id: string
          faculty_id: string | null
          semester: string
          code: string
          title: string
        }
      | undefined
    if (!sec || sec.faculty_id !== user.id) {
      return res.status(404).json({ error: 'Not found' })
    }

    const q = String(req.query.q || '').toLowerCase()

    const rows = db
      .prepare(
        `SELECT s.student_id, s.full_name, u.email, r.attendance_pct,
                g.override_grade, g.letter_grade, g.calculated_grade
         FROM registrations r
         JOIN students s ON s.user_id = r.student_id
         JOIN users u ON u.id = r.student_id
         LEFT JOIN grades g ON g.student_id = r.student_id AND g.section_id = r.section_id
         WHERE r.section_id = ? AND r.status = 'registered'`
      )
      .all(sectionId) as {
      student_id: string
      full_name: string
      email: string
      attendance_pct: number | null
      override_grade: string | null
      letter_grade: string | null
      calculated_grade: number | null
    }[]

    const filtered = q
      ? rows.filter(
          r =>
            r.student_id.toLowerCase().includes(q) ||
            r.full_name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        )
      : rows

    return res.json({
      section: {
        id: sec.id,
        code: sec.code,
        title: sec.title,
        semester: sec.semester,
      },
      students: filtered.map(r => ({
        studentId: r.student_id,
        name: r.full_name,
        email: r.email,
        attendancePct: r.attendance_pct ?? 0,
        currentGrade:
          r.override_grade || r.letter_grade || (r.calculated_grade != null ? String(r.calculated_grade) : '—'),
      })),
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.get('/grades/:sectionId', (req, res) => {
  try {
    const user = req.authUser!
    const { sectionId } = req.params
    const db = getDb()
    const sec = db
      .prepare(
        `SELECT s.id, s.faculty_id, s.semester, c.code, c.title
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.id = ?`
      )
      .get(sectionId) as
      | {
          id: string
          faculty_id: string | null
          semester: string
          code: string
          title: string
        }
      | undefined
    if (!sec || sec.faculty_id !== user.id) {
      return res.status(404).json({ error: 'Not found' })
    }

    const rows = db
      .prepare(
        `SELECT s.student_id, s.full_name, u.id AS user_id,
                g.midterm, g.final, g.assignment, g.calculated_grade, g.override_grade, g.letter_grade, g.is_final
         FROM registrations r
         JOIN students s ON s.user_id = r.student_id
         JOIN users u ON u.id = r.student_id
         LEFT JOIN grades g ON g.student_id = r.student_id AND g.section_id = r.section_id
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

    return res.json({
      section: {
        id: sec.id,
        code: sec.code,
        title: sec.title,
        semester: sec.semester,
      },
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
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.post('/grades/:sectionId', (req, res) => {
  try {
    const user = req.authUser!
    const { sectionId } = req.params
    const body = req.body || {}
    const action = body.action as 'draft' | 'final'
    const grades = body.grades as {
      userId: string
      midterm: number | null
      final: number | null
      assignment: number | null
      overrideGrade?: string | null
    }[]

    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'grades array required' })
    }

    const db = getDb()
    const sec = db
      .prepare(`SELECT id, faculty_id FROM sections WHERE id = ?`)
      .get(sectionId) as { id: string; faculty_id: string | null } | undefined
    if (!sec || sec.faculty_id !== user.id) {
      return res.status(404).json({ error: 'Not found' })
    }

    const now = new Date().toISOString()
    const isFinal = action === 'final' ? 1 : 0

    const insert = db.prepare(
      `INSERT INTO grades (id, student_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final)
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
          .prepare(`SELECT id, is_final FROM grades WHERE student_id = ? AND section_id = ?`)
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

    return res.json({ ok: true, locked: isFinal === 1 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.get('/overview', (req, res) => {
  try {
    const user = req.authUser!
    const db = getDb()
    const settings = db
      .prepare(`SELECT semester_label AS semester FROM registration_settings WHERE id = 1`)
      .get() as
      | { semester: string | null }
      | undefined
    const semester = settings?.semester || 'Spring 2026'

    const fac = db.prepare(`SELECT full_name FROM faculty WHERE user_id = ?`).get(user.id) as
      | { full_name: string }
      | undefined

    const sections = db
      .prepare(
        `SELECT s.id, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.code, c.title
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.faculty_id = ? AND s.semester = ?
         ORDER BY c.code`
      )
      .all(user.id, semester) as {
      id: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      capacity: number
      enrolled_count: number
      code: string
      title: string
    }[]

    const pendingGrades = db
      .prepare(
        `SELECT COUNT(*) as c FROM grades g
         JOIN sections s ON s.id = g.section_id
         WHERE s.faculty_id = ? AND g.is_final = 0`
      )
      .get(user.id) as { c: number }

    const totalStudents = db
      .prepare(
        `SELECT COUNT(DISTINCT r.student_id) as c FROM registrations r
         JOIN sections s ON s.id = r.section_id
         WHERE s.faculty_id = ? AND r.semester = ? AND r.status = 'registered'`
      )
      .get(user.id, semester) as { c: number }

    return res.json({
      semester,
      facultyName: fac?.full_name ?? 'Faculty',
      sections,
      stats: {
        coursesThisSemester: sections.length,
        totalStudents: totalStudents?.c ?? 0,
        pendingGradeSubmissions: pendingGrades?.c ?? 0,
      },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.get('/profile', (req, res) => {
  try {
    const user = req.authUser!
    const db = getDb()
    const row = db
      .prepare(`SELECT f.*, u.email AS user_email FROM faculty f JOIN users u ON u.id = f.user_id WHERE f.user_id = ?`)
      .get(user.id) as Record<string, unknown> | undefined
    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    return res.json({
      profile: { ...row, email: row.user_email },
      accountStatus: user.status,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

facultyRouter.put('/profile', async (req, res) => {
  try {
    const user = req.authUser!
    const body = (req.body || {}) as Record<string, unknown>
    const db = getDb()
    const cur = db.prepare(`SELECT * FROM faculty WHERE user_id = ?`).get(user.id) as Record<string, unknown> | undefined
    if (!cur) {
      return res.status(404).json({ error: 'Not found' })
    }

    const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : (cur[k] as string))

    db.prepare(
      `UPDATE faculty SET
        full_name = ?,
        department = ?,
        office_location = ?,
        office_hours = ?,
        phone = ?,
        photo_url = ?,
        courses_history = ?
      WHERE user_id = ?`
    ).run(
      str('full_name'),
      str('department'),
      str('office_location'),
      str('office_hours'),
      str('phone'),
      typeof body.photo_url === 'string' ? body.photo_url : (cur.photo_url as string) ?? '',
      typeof body.courses_history === 'string'
        ? body.courses_history
        : typeof body.courses_taught_history === 'string'
          ? body.courses_taught_history
          : (cur.courses_history as string) ?? '[]',
      user.id
    )

    const fresh = getAuthUserById(user.id)
    if (!fresh) {
      return res.status(404).json({ error: 'Not found' })
    }

    const token = await createSessionToken(fresh)
    attachAuthCookie(res, token)
    return res.json({ ok: true, user: fresh })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})
