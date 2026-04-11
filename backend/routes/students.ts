import { randomUUID } from 'crypto'
import { Router } from 'express'
import { createSessionToken } from '@/lib/auth'
import { letterToPoints } from '@/lib/grade-utils'
import { sectionsTimeConflict } from '@/lib/schedule-utils'
import {
  findTimeConflictWithSet,
  getRegistrationSettings,
  getSectionRow,
  listStudentSectionsForSemester,
  prereqMet,
} from '@/lib/student-helpers'
import { getAuthUserById } from '../auth/user-service'
import { attachAuthCookie } from '../cookies'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'

export const studentRouter = Router()

function formatSlot(days: string | null, start: string | null, end: string | null) {
  const d = days || ''
  const t = start && end ? `${start}-${end}` : ''
  return `${d} ${t}`.trim()
}

studentRouter.use(requireAuth)
studentRouter.use(requireRole('student'))

studentRouter.get('/overview', (req, res) => {
  try {
    const user = req.authUser!
    const db = getDb()
    const st = db
      .prepare(
        `SELECT full_name, gpa, credits_completed, student_id, major FROM students WHERE user_id = ?`
      )
      .get(user.id) as
      | {
          full_name: string
          gpa: number
          credits_completed: number
          student_id: string
          major: string | null
        }
      | undefined

    const settings = db
      .prepare(
        `SELECT semester_label AS semester, is_open, max_credits FROM registration_settings WHERE id = 1`
      )
      .get() as { semester: string | null; is_open: number; max_credits: number } | undefined

    const announcements = db
      .prepare(
        `SELECT id, title, content, created_at FROM announcements
         WHERE target_role IN ('all','student') ORDER BY created_at DESC LIMIT 6`
      )
      .all() as { id: string; title: string; content: string; created_at: string }[]

    const required = 120
    const completed = st?.credits_completed ?? 0
    const remaining = Math.max(0, required - completed)
    const semester = settings?.semester ?? 'Spring 2026'

    const regRow = db
      .prepare(
        `SELECT SUM(c.credits) as s FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.student_id = ? AND r.semester = ? AND r.status = 'registered'`
      )
      .get(user.id, semester) as { s: number | null } | undefined
    const registeredCredits = regRow?.s ?? 0

    return res.json({
      student: {
        name: st?.full_name ?? `${user.firstName} ${user.lastName}`,
        studentId: st?.student_id ?? user.studentId,
        major: st?.major?.trim() || null,
        gpa: st?.gpa ?? 0,
        creditsCompleted: completed,
        registeredCredits,
        remainingHours: remaining,
        requiredCredits: required,
      },
      registration: {
        semester,
        isOpen: Boolean(settings?.is_open),
        maxCredits: settings?.max_credits ?? 18,
      },
      announcements,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

function sectionsHandler(req: import('express').Request, res: import('express').Response) {
  try {
    const user = req.authUser!
    const semester = String(req.query.semester || '')
    const q = String(req.query.q || '').toLowerCase()
    const dept = String(req.query.department || '').toLowerCase()

    if (!semester) {
      return res.status(400).json({ error: 'semester is required' })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT s.id, s.semester, s.days, s.start_time, s.end_time, s.room, s.capacity, s.enrolled_count,
                c.id AS course_id, c.code, c.title, c.credits, c.department,
                f.full_name AS instructor_name
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         LEFT JOIN faculty f ON f.user_id = s.faculty_id
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

    return res.json({ sections: filtered })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

studentRouter.get('/sections', sectionsHandler)

function cartGet(req: import('express').Request, res: import('express').Response) {
  try {
    const user = req.authUser!
    const semester = String(req.query.semester || '')
    if (!semester) {
      return res.status(400).json({ error: 'semester is required' })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT r.id, r.section_id, r.semester, r.status, s.days, s.start_time, s.end_time, s.room,
                c.code AS course_code, c.title AS course_title, c.credits, c.id AS course_id
         FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.student_id = ? AND r.semester = ? AND r.status = 'cart'
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

    return res.json({
      items: rows,
      totalCredits,
      maxCredits,
      overLimit: totalCredits > maxCredits,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

studentRouter.get('/cart', cartGet)
studentRouter.get('/registrations', cartGet)

async function cartPost(req: import('express').Request, res: import('express').Response) {
  try {
    const user = req.authUser!
    const body = req.body || {}
    const sectionId = body.sectionId as string
    let semester = body.semester as string | undefined
    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId required' })
    }

    const db = getDb()
    const settings = getRegistrationSettings(db)
    if (!settings?.is_open) {
      return res.json({ ok: false, code: 'CLOSED', message: 'Registration is closed for this period.' })
    }
    if (!semester) semester = settings.semester || undefined
    if (!semester) {
      return res.status(400).json({ error: 'semester required' })
    }

    const sec = getSectionRow(db, sectionId)
    if (!sec || sec.semester !== semester) {
      return res.status(404).json({ error: 'Section not found' })
    }

    const dupCourse = db
      .prepare(
        `SELECT c.code FROM registrations r
         JOIN sections s ON s.id = r.section_id
         JOIN courses c ON c.id = s.course_id
         WHERE r.student_id = ? AND r.semester = ? AND r.status IN ('cart','registered')
           AND s.course_id = ? AND r.section_id != ?`
      )
      .get(user.id, semester, sec.course_id, sectionId) as { code: string } | undefined

    if (dupCourse) {
      return res.json({
        ok: false,
        code: 'DUPLICATE_COURSE',
        message: `You already have ${dupCourse.code} in your schedule for this semester.`,
      })
    }

    const prereq = prereqMet(db, user.id, sec.course_id)
    if (!prereq.ok) {
      return res.json({
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
      return res.json({
        ok: false,
        code: 'CONFLICT',
        message: `Time conflict with ${tc.withCode} (${formatSlot(other?.days ?? null, other?.start_time ?? null, other?.end_time ?? null)})`,
      })
    }

    const sumCredits = existingRows.reduce((s, r) => s + r.credits, 0) + sec.credits

    if (sumCredits > (settings.max_credits ?? 18)) {
      return res.json({
        ok: false,
        code: 'CREDITS',
        message: `Adding this course would exceed the maximum of ${settings.max_credits ?? 18} credit hours.`,
      })
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO registrations (id, student_id, section_id, semester, status, registered_at, attendance_pct)
       VALUES (?, ?, ?, ?, 'cart', ?, 100)
       ON CONFLICT(student_id, section_id, semester) DO UPDATE SET status = 'cart', registered_at = excluded.registered_at`
    ).run(id, user.id, sectionId, semester, now)

    return res.json({ ok: true, code: 'ADDED', message: 'Added successfully' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

studentRouter.post('/cart', cartPost)
studentRouter.post('/registrations', cartPost)

function cartDelete(req: import('express').Request, res: import('express').Response) {
  try {
    const user = req.authUser!
    const sectionId = String(req.query.sectionId || '')
    const semester = String(req.query.semester || '')
    if (!sectionId || !semester) {
      return res.status(400).json({ error: 'sectionId and semester required' })
    }

    const db = getDb()
    db.prepare(
      `DELETE FROM registrations WHERE student_id = ? AND section_id = ? AND semester = ? AND status = 'cart'`
    ).run(user.id, sectionId, semester)

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

studentRouter.delete('/cart', cartDelete)
studentRouter.delete('/registrations', cartDelete)

async function confirmRegistration(req: import('express').Request, res: import('express').Response) {
  try {
    const user = req.authUser!
    const body = req.body || {}
    const semester = body.semester as string | undefined
    if (!semester) {
      return res.status(400).json({ error: 'semester required' })
    }

    const db = getDb()
    const settings = getRegistrationSettings(db)
    if (!settings?.is_open) {
      return res.status(400).json({ error: 'Registration is closed.' })
    }

    const cart = listStudentSectionsForSemester(db, user.id, semester, ['cart'])
    if (cart.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' })
    }

    const maxCredits = settings.max_credits ?? 18
    const credits = cart.reduce((s, r) => s + r.credits, 0)
    if (credits > maxCredits) {
      return res.status(400).json({
        error: `Total credits (${credits}) exceed the maximum (${maxCredits}).`,
      })
    }

    for (const row of cart) {
      const pr = prereqMet(db, user.id, row.course_id)
      if (!pr.ok) {
        return res.status(400).json({
          error: `Prerequisites not met for a course in your cart (${pr.missing.join(', ')}).`,
        })
      }
    }

    for (let i = 0; i < cart.length; i++) {
      for (let j = i + 1; j < cart.length; j++) {
        if (
          sectionsTimeConflict(
            {
              semester: cart[i].semester,
              days: cart[i].days,
              start_time: cart[i].start_time,
              end_time: cart[i].end_time,
            },
            {
              semester: cart[j].semester,
              days: cart[j].days,
              start_time: cart[j].start_time,
              end_time: cart[j].end_time,
            }
          )
        ) {
          return res.status(400).json({
            error: 'There are time conflicts in your cart. Remove conflicting courses before confirming.',
          })
        }
      }
    }

    const now = new Date().toISOString()
    db.prepare(
      `UPDATE registrations SET status = 'registered', registered_at = ? WHERE student_id = ? AND semester = ? AND status = 'cart'`
    ).run(now, user.id, semester)

    const sections = db.prepare('SELECT id FROM sections').all() as { id: string }[]
    const upd = db.prepare(
      `UPDATE sections SET enrolled_count = (
        SELECT COUNT(*) FROM registrations WHERE section_id = sections.id AND status = 'registered'
      ) WHERE id = ?`
    )
    for (const s of sections) {
      upd.run(s.id)
    }

    return res.json({ ok: true, message: 'Registration confirmed.' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

studentRouter.post('/registration/confirm', confirmRegistration)
studentRouter.post('/registrations/confirm', confirmRegistration)

studentRouter.get('/schedule', (req, res) => {
  try {
    const user = req.authUser!
    const semester = String(req.query.semester || '')
    if (!semester) {
      return res.status(400).json({ error: 'semester required' })
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

    return res.json({
      semester,
      maxCredits: settings?.max_credits ?? 18,
      totalCredits,
      sections: rows,
      conflicts,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

studentRouter.get('/grades', (req, res) => {
  try {
    const user = req.authUser!
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
         WHERE g.student_id = ? AND g.is_final = 1
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

    return res.json({
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
    return res.status(500).json({ error: 'Server error' })
  }
})

studentRouter.get('/profile', (req, res) => {
  try {
    const user = req.authUser!
    const db = getDb()
    const row = db
      .prepare(
        `SELECT s.*, u.email AS user_email FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id = ?`
      )
      .get(user.id) as Record<string, unknown> | undefined

    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    return res.json({
      profile: {
        ...row,
        email: row.user_email,
        accountStatus: user.status,
      },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

studentRouter.put('/profile', async (req, res) => {
  try {
    const user = req.authUser!
    const body = (req.body || {}) as Record<string, unknown>
    const db = getDb()
    const cur = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(user.id) as
      | Record<string, unknown>
      | undefined
    if (!cur) {
      return res.status(404).json({ error: 'Not found' })
    }

    const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : (cur[k] as string))
    const markComplete = body.markComplete === true || body.profile_completed === true

    const profile_completed = markComplete ? 1 : (cur.profile_completed as number) ? 1 : 0

    db.prepare(
      `UPDATE students SET
        full_name = ?,
        major = ?,
        minor = ?,
        level = ?,
        phone = ?,
        emergency_contact = ?,
        photo_url = ?,
        profile_completed = ?
      WHERE user_id = ?`
    ).run(
      str('full_name'),
      str('major'),
      str('minor'),
      str('level'),
      str('phone'),
      str('emergency_contact'),
      typeof body.photo_url === 'string' ? body.photo_url : (cur.photo_url as string | null) ?? '',
      profile_completed,
      user.id
    )

    const fresh = getAuthUserById(user.id)
    if (!fresh) {
      return res.status(404).json({ error: 'User not found' })
    }

    const token = await createSessionToken(fresh)
    attachAuthCookie(res, token)
    return res.json({ ok: true, user: fresh })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})
