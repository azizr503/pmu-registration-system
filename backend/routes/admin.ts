import { randomBytes, randomUUID } from 'crypto'
import { Router } from 'express'
import { hashPassword, inferRoleFromEmail, isValidPMUEmail } from '@/lib/auth'
import type { UserStatus } from '@/types/auth'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'

function generateTempPassword(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const buf = randomBytes(length)
  let s = ''
  for (let i = 0; i < length; i++) s += chars[buf[i]! % chars.length]
  return s
}

export const adminRouter = Router()
adminRouter.use(requireAuth)
adminRouter.use(requireRole('admin'))

adminRouter.get('/users', (_req, res) => {
  try {
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

    return res.json({ users })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.post('/users', async (req, res) => {
  try {
    const body = req.body || {}
    const { email, password, full_name, role, status } = body as {
      email: string
      password: string
      full_name: string
      role: 'student' | 'faculty' | 'admin'
      status?: UserStatus
    }

    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const fullName = typeof full_name === 'string' ? full_name.trim() : ''
    const passwordRaw = typeof password === 'string' ? password.trim() : ''

    if (!emailNorm || !fullName || !role) {
      return res.status(400).json({ error: 'Full name, email, and role are required' })
    }

    if (!isValidPMUEmail(emailNorm)) {
      return res.status(400).json({ error: 'Email must be a valid @pmu.edu.sa address' })
    }

    let plainPassword = passwordRaw
    let didGeneratePassword = false
    if (!plainPassword) {
      plainPassword = generateTempPassword()
      didGeneratePassword = true
    } else if (plainPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters (or leave blank to auto-generate)' })
    }

    const statusNorm: UserStatus = status === 'inactive' ? 'inactive' : 'active'

    const inferred = inferRoleFromEmail(emailNorm)
    if (inferred && inferred.role !== role) {
      return res.status(400).json({ error: 'Email pattern does not match selected role' })
    }
    if (role === 'student' && !inferred?.studentId) {
      return res.status(400).json({
        error: 'Student accounts must use an email like s.XXXXXXX@pmu.edu.sa',
      })
    }
    if (role === 'faculty' && !inferred?.facultyId) {
      return res.status(400).json({
        error: 'Faculty accounts must use an email like f.XXXXXXX@pmu.edu.sa',
      })
    }

    const db = getDb()
    const exists = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(emailNorm) as
      | { id: string }
      | undefined
    if (exists) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const id = randomUUID()
    const hashed = await hashPassword(plainPassword)
    const now = new Date().toISOString()

    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`
      ).run(id, emailNorm, hashed, role, statusNorm, now)

      if (role === 'student' && inferred?.studentId) {
        db.prepare(
          `INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
           VALUES (?, ?, ?, '', '', 'Freshman', 0, 0, NULL, '', '', 0)`
        ).run(id, inferred.studentId, fullName)
      } else if (role === 'faculty' && inferred?.facultyId) {
        db.prepare(
          `INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, photo_url, courses_history)
           VALUES (?, ?, ?, '', '', '', '', '', '[]')`
        ).run(id, inferred.facultyId, fullName)
      }
    })
    run()

    const externalId =
      role === 'student' && inferred?.studentId
        ? inferred.studentId
        : role === 'faculty' && inferred?.facultyId
          ? inferred.facultyId
          : role === 'admin'
            ? 'admin'
            : ''

    const createdUser = {
      id,
      email: emailNorm,
      role,
      status: statusNorm,
      lastLogin: null as string | null,
      name: fullName,
      externalId,
    }

    return res.json({
      ok: true,
      user: createdUser,
      ...(didGeneratePassword ? { temporaryPassword: plainPassword } : {}),
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.patch('/users/:id', (req, res) => {
  try {
    const { id } = req.params
    const body = req.body || {}
    const status = body.status as 'active' | 'inactive' | undefined

    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const db = getDb()
    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: string; role: string }
      | undefined
    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    if (row.role === 'admin' && status === 'inactive') {
      const adminCount = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as { c: number })
        .c
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the last administrator account.' })
      }
    }

    db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, id)

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/users/:id', (req, res) => {
  try {
    const admin = req.authUser!
    const { id } = req.params
    if (id === admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' })
    }

    const db = getDb()
    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: string; role: string }
      | undefined
    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    if (row.role === 'admin') {
      const adminCount = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as { c: number })
        .c
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator account.' })
      }
    }

    const run = db.transaction(() => {
      db.prepare(`UPDATE students SET advisor_id = NULL WHERE advisor_id = ?`).run(id)
      db.prepare(`DELETE FROM grades WHERE student_id = ?`).run(id)
      db.prepare(`DELETE FROM registrations WHERE student_id = ?`).run(id)
      db.prepare(`UPDATE sections SET faculty_id = NULL WHERE faculty_id = ?`).run(id)
      db.prepare(`DELETE FROM students WHERE user_id = ?`).run(id)
      db.prepare(`DELETE FROM faculty WHERE user_id = ?`).run(id)
      db.prepare(`UPDATE announcements SET created_by = NULL WHERE created_by = ?`).run(id)
      db.prepare(`DELETE FROM users WHERE id = ?`).run(id)
    })
    run()

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/courses', (_req, res) => {
  try {
    const db = getDb()
    const courses = db.prepare(`SELECT * FROM courses ORDER BY code`).all()
    const sections = db
      .prepare(
        `SELECT s.*, c.code AS course_code, u.email AS faculty_email, f.full_name AS faculty_name
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         LEFT JOIN users u ON u.id = s.faculty_id
         LEFT JOIN faculty f ON f.user_id = s.faculty_id
         ORDER BY s.semester DESC, c.code`
      )
      .all()

    return res.json({ courses, sections })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.post('/courses', (req, res) => {
  try {
    const body = req.body || {}
    const kind = body.kind as 'course' | 'section'

    const db = getDb()

    if (kind === 'course') {
      const { code, title, credits, department, description, prerequisites } = body as {
        code: string
        title: string
        credits: number
        department?: string
        description?: string
        prerequisites?: string[]
      }
      if (!code || !title || credits == null) {
        return res.status(400).json({ error: 'code, title, credits required' })
      }
      const id = randomUUID()
      const prereq = JSON.stringify(prerequisites ?? [])
      db.prepare(
        `INSERT INTO courses (id, code, title, credits, department, description, prerequisites)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, code, title, credits, department ?? '', description ?? '', prereq)
      return res.json({ ok: true, id })
    }

    if (kind === 'section') {
      const {
        course_id,
        faculty_id,
        semester,
        days,
        start_time,
        end_time,
        room,
        capacity,
      } = body as {
        course_id: string
        faculty_id: string | null
        semester: string
        days: string
        start_time: string
        end_time: string
        room: string
        capacity: number
      }
      if (!course_id || !semester) {
        return res.status(400).json({ error: 'course_id and semester required' })
      }
      const id = randomUUID()
      db.prepare(
        `INSERT INTO sections (id, course_id, faculty_id, semester, days, start_time, end_time, room, capacity, enrolled_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(
        id,
        course_id,
        faculty_id || null,
        semester,
        days ?? '',
        start_time ?? '',
        end_time ?? '',
        room ?? '',
        capacity ?? 40
      )
      return res.json({ ok: true, id })
    }

    return res.status(400).json({ error: 'kind must be course or section' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.patch('/courses/:id', (req, res) => {
  try {
    const { id } = req.params
    const body = req.body || {}
    const { code, title, credits, department, description, prerequisites } = body as {
      code?: string
      title?: string
      credits?: number
      department?: string
      description?: string
      prerequisites?: string[]
    }

    const db = getDb()
    const cur = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(id) as { id: string } | undefined
    if (!cur) {
      return res.status(404).json({ error: 'Not found' })
    }

    const row = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(id) as Record<string, unknown>
    const prereqStr =
      prerequisites != null ? JSON.stringify(prerequisites) : (row.prerequisites as string) ?? '[]'

    db.prepare(
      `UPDATE courses SET
        code = COALESCE(?, code),
        title = COALESCE(?, title),
        credits = COALESCE(?, credits),
        department = COALESCE(?, department),
        description = COALESCE(?, description),
        prerequisites = COALESCE(?, prerequisites)
      WHERE id = ?`
    ).run(
      code ?? null,
      title ?? null,
      credits ?? null,
      department ?? null,
      description ?? null,
      prerequisites != null ? prereqStr : null,
      id
    )

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/courses/:id', (req, res) => {
  try {
    const { id } = req.params
    const db = getDb()
    const cur = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(id) as { id: string } | undefined
    if (!cur) {
      return res.status(404).json({ error: 'Not found' })
    }

    const run = db.transaction(() => {
      const sectionIds = db.prepare(`SELECT id FROM sections WHERE course_id = ?`).all(id) as { id: string }[]
      for (const s of sectionIds) {
        db.prepare(`DELETE FROM grades WHERE section_id = ?`).run(s.id)
        db.prepare(`DELETE FROM registrations WHERE section_id = ?`).run(s.id)
      }
      db.prepare(`DELETE FROM sections WHERE course_id = ?`).run(id)
      db.prepare(`DELETE FROM courses WHERE id = ?`).run(id)
    })
    run()

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/dashboard', (_req, res) => {
  try {
    const db = getDb()
    const students = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'student'`).get() as { c: number }
    const faculty = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'faculty'`).get() as { c: number }
    const activeRegs = db
      .prepare(`SELECT COUNT(*) as c FROM registrations WHERE status = 'registered'`)
      .get() as { c: number }
    const openCourses = db.prepare(`SELECT COUNT(*) as c FROM sections`).get() as { c: number }

    const settings = db
      .prepare(
        `SELECT semester_label AS semester, is_open, start_date, end_date FROM registration_settings WHERE id = 1`
      )
      .get() as
      | {
          semester: string | null
          is_open: number
          start_date: string | null
          end_date: string | null
        }
      | undefined

    return res.json({
      stats: {
        totalStudents: students.c,
        totalFaculty: faculty.c,
        activeRegistrations: activeRegs.c,
        openCourses: openCourses.c,
      },
      registration: {
        semester: settings?.semester || 'Spring 2026',
        isOpen: Boolean(settings?.is_open ?? 1),
        startDate: settings?.start_date || '2026-01-15',
        endDate: settings?.end_date || '2026-02-15',
      },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/registration', (_req, res) => {
  try {
    const db = getDb()
    const settings = db
      .prepare(
        `SELECT id, is_open, semester_label AS semester, start_date, end_date, max_credits FROM registration_settings WHERE id = 1`
      )
      .get() as {
      id: number
      is_open: number
      semester: string | null
      start_date: string | null
      end_date: string | null
      max_credits: number
    } | null

    const semester = settings?.semester || 'Spring 2026'

    const stats = db
      .prepare(
        `SELECT semester, COUNT(*) as c FROM registrations WHERE status = 'registered' GROUP BY semester`
      )
      .all()

    const totalRegisteredThisSemester = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM registrations WHERE semester = ? AND status = 'registered'`
        )
        .get(semester) as { c: number }
    ).c

    const studentsNotRegistered = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM users u
           WHERE u.role = 'student'
             AND NOT EXISTS (
               SELECT 1 FROM registrations r
               WHERE r.student_id = u.id AND r.semester = ? AND r.status = 'registered'
             )`
        )
        .get(semester) as { c: number }
    ).c

    const popular = db
      .prepare(
        `SELECT c.code, c.title, s.enrolled_count
         FROM sections s
         JOIN courses c ON c.id = s.course_id
         WHERE s.semester = ?
         ORDER BY s.enrolled_count DESC
         LIMIT 1`
      )
      .get(semester) as { code: string; title: string; enrolled_count: number } | undefined

    return res.json({
      settings,
      stats,
      analytics: {
        semester,
        totalRegisteredRowsThisSemester: totalRegisteredThisSemester,
        studentsWhoHaveNotRegistered: studentsNotRegistered,
        mostPopularCourse: popular
          ? { code: popular.code, title: popular.title, enrolled: popular.enrolled_count }
          : null,
      },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.put('/registration', (req, res) => {
  try {
    const body = req.body || {}
    const { semester, is_open, start_date, end_date, max_credits } = body as {
      semester?: string
      is_open?: boolean
      start_date?: string
      end_date?: string
      max_credits?: number
    }

    const db = getDb()
    db.prepare(
      `UPDATE registration_settings SET
        semester_label = COALESCE(?, semester_label),
        is_open = COALESCE(?, is_open),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        max_credits = COALESCE(?, max_credits)
      WHERE id = 1`
    ).run(
      semester ?? null,
      typeof is_open === 'boolean' ? (is_open ? 1 : 0) : null,
      start_date ?? null,
      end_date ?? null,
      max_credits ?? null
    )

    const settings = db
      .prepare(
        `SELECT id, is_open, semester_label AS semester, start_date, end_date, max_credits FROM registration_settings WHERE id = 1`
      )
      .get()
    return res.json({ ok: true, settings })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})
