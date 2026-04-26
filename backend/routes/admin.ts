import { randomBytes, randomUUID } from 'crypto'
import { Router } from 'express'
import { hashPassword, inferRoleFromEmail, isValidPMUEmail, verifyPassword } from '@/lib/auth'
import type { UserStatus } from '@/types/auth'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'
import multer from 'multer'
import XLSX from 'xlsx'

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

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

type StudentImportRow = {
  id: string
  name: string
  email: string
  major: string
  password: string
}

type FacultyImportRow = {
  id: string
  name: string
  email: string
  department: string
  password: string
}

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

function isValidImportFilename(name: string): boolean {
  const x = name.toLowerCase()
  return x.endsWith('.xlsx') || x.endsWith('.xls') || x.endsWith('.csv')
}

function parseImportSheet(fileBuffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' })
  const first = wb.SheetNames[0]
  if (!first) return []
  const ws = wb.Sheets[first]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
}

function detectImportType(rows: Record<string, unknown>[]): 'students' | 'faculty' | null {
  if (rows.length === 0) return null
  const keys = new Set(Object.keys(rows[0]!).map(normalizeHeader))
  const studentCols = ['id', 'name', 'email', 'major', 'password']
  const facultyCols = ['id', 'name', 'email', 'department', 'password']
  if (studentCols.every(k => keys.has(k))) return 'students'
  if (facultyCols.every(k => keys.has(k))) return 'faculty'
  return null
}

function valueByHeader<T extends string>(row: Record<string, unknown>, header: T): string {
  for (const [k, v] of Object.entries(row)) {
    if (normalizeHeader(k) === header) return String(v ?? '').trim()
  }
  return ''
}

adminRouter.post('/import/analyze', importUpload.single('file'), (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'File is required' })
    if (!isValidImportFilename(file.originalname)) {
      return res.status(400).json({ error: 'Only .xlsx, .xls, and .csv files are supported' })
    }

    const rawRows = parseImportSheet(file.buffer)
    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty' })
    }

    const forcedTypeRaw = String(req.body?.forced_type || req.query?.forced_type || '').toLowerCase()
    const forcedType = forcedTypeRaw === 'students' || forcedTypeRaw === 'faculty' ? forcedTypeRaw : null

    const type = forcedType || detectImportType(rawRows)
    if (!type) {
      return res.status(400).json({
        error:
          'Could not detect file type. Student file must include: id, name, email, major, password. Faculty file must include: id, name, email, department, password.',
      })
    }

    const db = getDb()
    if (type === 'students') {
      const rows: StudentImportRow[] = rawRows.map(r => ({
        id: valueByHeader(r, 'id'),
        name: valueByHeader(r, 'name'),
        email: valueByHeader(r, 'email').toLowerCase(),
        major: valueByHeader(r, 'major') || 'Computer Science',
        password: valueByHeader(r, 'password'),
      }))
      const existingStudentIds = (
        db.prepare(`SELECT student_id FROM students WHERE student_id IS NOT NULL`).all() as { student_id: string }[]
      ).map(r => r.student_id.toLowerCase())
      const existingEmails = (db.prepare(`SELECT email FROM users`).all() as { email: string }[]).map(r =>
        r.email.toLowerCase()
      )
      return res.json({
        ok: true,
        type,
        rows,
        existing: { existingIds: existingStudentIds, existingEmails },
      })
    }

    const rows: FacultyImportRow[] = rawRows.map(r => ({
      id: valueByHeader(r, 'id'),
      name: valueByHeader(r, 'name'),
      email: valueByHeader(r, 'email').toLowerCase(),
      department: valueByHeader(r, 'department') || 'Computer Science',
      password: valueByHeader(r, 'password'),
    }))
    const existingFacultyIds = (
      db.prepare(`SELECT faculty_id FROM faculty WHERE faculty_id IS NOT NULL`).all() as { faculty_id: string }[]
    ).map(r => r.faculty_id.toLowerCase())
    const existingEmails = (db.prepare(`SELECT email FROM users`).all() as { email: string }[]).map(r =>
      r.email.toLowerCase()
    )
    return res.json({
      ok: true,
      type,
      rows,
      existing: { existingIds: existingFacultyIds, existingEmails },
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

type UserDeleteTarget = {
  id: string
  role: string
}

function deleteUserById(db: ReturnType<typeof getDb>, target: UserDeleteTarget, actingAdminId: string) {
  if (target.id === actingAdminId) {
    return { ok: false as const, status: 400, error: 'You cannot delete your own account.' }
  }

  if (target.role === 'admin') {
    const adminCount = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as { c: number }).c
    if (adminCount <= 1) {
      return { ok: false as const, status: 400, error: 'Cannot delete the last administrator account.' }
    }
  }

  const run = db.transaction(() => {
    db.prepare(`UPDATE students SET advisor_id = NULL WHERE advisor_id = ?`).run(target.id)
    db.prepare(`UPDATE sections SET faculty_id = NULL WHERE faculty_id = ?`).run(target.id)
    db.prepare(`UPDATE announcements SET created_by = NULL WHERE created_by = ?`).run(target.id)
    db.prepare(`UPDATE eform_requests SET reviewed_by = NULL WHERE reviewed_by = ?`).run(target.id)
    db.prepare(`DELETE FROM grades WHERE student_id = ?`).run(target.id)
    db.prepare(`DELETE FROM registrations WHERE student_id = ?`).run(target.id)
    db.prepare(`DELETE FROM eform_requests WHERE student_id = ?`).run(target.id)
    db.prepare(`DELETE FROM students WHERE user_id = ?`).run(target.id)
    db.prepare(`DELETE FROM faculty WHERE user_id = ?`).run(target.id)
    db.prepare(`DELETE FROM users WHERE id = ?`).run(target.id)
  })
  run()

  return { ok: true as const }
}

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

const STUDENT_MAJORS = new Set([
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cybersecurity',
])

const STUDENT_LEVELS = new Set(['Freshman', 'Sophomore', 'Junior', 'Senior'])

const FACULTY_DEPARTMENTS = new Set([
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cybersecurity',
  'Mathematics',
  'Physics',
  'English',
])

function normalizeStudentIdField(raw: unknown): string {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (s.toLowerCase().startsWith('s.')) s = s.slice(2)
  return s
}

function normalizeFacultyIdField(raw: unknown): string {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (s.toLowerCase().startsWith('f.')) s = s.slice(2)
  return s
}

adminRouter.post('/users', async (req, res) => {
  try {
    const body = req.body || {}
    const {
      email,
      password,
      full_name,
      role,
      status,
      student_id: bodyStudentId,
      major,
      level,
      gpa: bodyGpa,
      credits_completed: bodyCredits,
      phone: bodyPhone,
      emergency_contact,
      faculty_id: bodyFacultyId,
      department,
      office_location,
      office_hours,
    } = body as {
      email: string
      password: string
      full_name: string
      role: 'student' | 'faculty' | 'admin'
      status?: UserStatus
      student_id?: string
      major?: string
      level?: string
      gpa?: number | string
      credits_completed?: number | string
      phone?: string
      emergency_contact?: string
      faculty_id?: string
      department?: string
      office_location?: string
      office_hours?: string
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
        error: 'Faculty accounts must use an email like f.XXXXXX@pmu.edu.sa',
      })
    }

    const sidFromField = normalizeStudentIdField(bodyStudentId)
    if (role === 'student' && inferred?.studentId && sidFromField && sidFromField !== inferred.studentId) {
      return res.status(400).json({
        error: 'Student ID must match the email local part (e.g. s.202012345@pmu.edu.sa and Student ID s.202012345)',
      })
    }

    const fidFromField = normalizeFacultyIdField(bodyFacultyId)
    if (role === 'faculty' && inferred?.facultyId && fidFromField && fidFromField !== inferred.facultyId) {
      return res.status(400).json({
        error: 'Faculty ID must match the email local part (e.g. f.100001@pmu.edu.sa and Faculty ID f.100001)',
      })
    }

    let majorNorm = typeof major === 'string' ? major.trim() : ''
    let levelNorm = typeof level === 'string' ? level.trim() : ''
    let deptNorm = typeof department === 'string' ? department.trim() : ''

    if (role === 'student') {
      if (!majorNorm || !STUDENT_MAJORS.has(majorNorm)) {
        return res.status(400).json({ error: 'Valid major is required for students' })
      }
      if (!levelNorm || !STUDENT_LEVELS.has(levelNorm)) {
        return res.status(400).json({ error: 'Valid academic level is required for students' })
      }
    }

    if (role === 'faculty') {
      if (!deptNorm || !FACULTY_DEPARTMENTS.has(deptNorm)) {
        return res.status(400).json({ error: 'Valid department is required for faculty' })
      }
    }

    let gpaVal = 0
    let creditsVal = 0
    if (role === 'student') {
      const gpaNum = typeof bodyGpa === 'number' ? bodyGpa : parseFloat(String(bodyGpa ?? '0'))
      if (Number.isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4) {
        return res.status(400).json({ error: 'GPA must be between 0.00 and 4.00' })
      }
      gpaVal = Math.round(gpaNum * 100) / 100
      const cr = typeof bodyCredits === 'number' ? bodyCredits : parseInt(String(bodyCredits ?? '0'), 10)
      if (Number.isNaN(cr) || cr < 0) {
        return res.status(400).json({ error: 'Credits completed must be a non-negative integer' })
      }
      creditsVal = cr
    }

    const phoneNorm = typeof bodyPhone === 'string' ? bodyPhone.trim() : ''
    const emerg = typeof emergency_contact === 'string' ? emergency_contact.trim() : ''
    const officeLoc = typeof office_location === 'string' ? office_location.trim() : ''
    const officeHrs = typeof office_hours === 'string' ? office_hours.trim() : ''

    const db = getDb()
    const exists = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(emailNorm) as
      | { id: string }
      | undefined
    if (exists) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    if (role === 'student' && inferred?.studentId) {
      const dupeSid = db.prepare(`SELECT user_id FROM students WHERE student_id = ?`).get(inferred.studentId) as
        | { user_id: string }
        | undefined
      if (dupeSid) {
        return res.status(409).json({ error: 'That student ID is already in use' })
      }
    }
    if (role === 'faculty' && inferred?.facultyId) {
      const dupeFid = db.prepare(`SELECT user_id FROM faculty WHERE faculty_id = ?`).get(inferred.facultyId) as
        | { user_id: string }
        | undefined
      if (dupeFid) {
        return res.status(409).json({ error: 'That faculty ID is already in use' })
      }
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
           VALUES (?, ?, ?, ?, '', ?, ?, ?, NULL, ?, ?, 1)`
        ).run(
          id,
          inferred.studentId,
          fullName,
          majorNorm,
          levelNorm,
          gpaVal,
          creditsVal,
          phoneNorm,
          emerg
        )
      } else if (role === 'faculty' && inferred?.facultyId) {
        db.prepare(
          `INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, photo_url, courses_history)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', '[]')`
        ).run(id, inferred.facultyId, fullName, deptNorm, officeLoc, officeHrs, phoneNorm)
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

    const db = getDb()
    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: string; role: string }
      | undefined
    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    const deleted = deleteUserById(db, row, admin.id)
    if (!deleted.ok) {
      return res.status(deleted.status).json({ error: deleted.error })
    }

    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/ai-actions', async (req, res) => {
  try {
    const admin = req.authUser!
    const body = req.body || {}
    const actionType = String(body.action_type || '')
    const targetUserId = String(body.target_user_id || '')
    const adminPassword = String(body.admin_password || '')
    const targetUserName = String(body.target_user_name || '').trim()

    if (actionType !== 'delete_user') {
      return res.status(400).json({ error: 'Unsupported action type' })
    }
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' })
    }
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required' })
    }

    const db = getDb()
    const adminCred = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(admin.id) as
      | { password_hash: string }
      | undefined
    if (!adminCred) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const passOk = await verifyPassword(adminPassword, adminCred.password_hash)
    if (!passOk) {
      return res.status(403).json({ error: 'Incorrect password' })
    }

    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(targetUserId) as
      | { id: string; role: string }
      | undefined
    if (!row) {
      return res.status(404).json({ error: 'User not found' })
    }

    const deleted = deleteUserById(db, row, admin.id)
    if (!deleted.ok) {
      return res.status(deleted.status).json({ error: deleted.error })
    }

    return res.json({
      ok: true,
      message: `User ${targetUserName || targetUserId} has been deleted successfully`,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.post('/import/execute', async (req, res) => {
  try {
    const admin = req.authUser!
    const body = req.body || {}
    const type = String(body.type || '') as 'students' | 'faculty'
    const adminPassword = String(body.adminPassword || '')
    const data = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : []

    if (type !== 'students' && type !== 'faculty') {
      return res.status(400).json({ error: 'Invalid import type' })
    }
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required' })
    }

    const db = getDb()
    const adminCred = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(admin.id) as
      | { password_hash: string }
      | undefined
    if (!adminCred) return res.status(401).json({ error: 'Not authenticated' })

    const passOk = await verifyPassword(adminPassword, adminCred.password_hash)
    if (!passOk) return res.status(403).json({ error: 'Incorrect password' })

    let imported = 0
    let skipped = 0

    if (type === 'students') {
      const seenIds = new Set<string>()
      const seenEmails = new Set<string>()
      for (const row of data) {
        const id = String(row.id || '').trim()
        const name = String(row.name || '').trim()
        const email = String(row.email || '').trim().toLowerCase()
        const major = String(row.major || 'Computer Science').trim() || 'Computer Science'
        const passwordRaw = String(row.password || '').trim()

        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        if (!id || !name || !email || !passwordRaw || !emailOk) {
          skipped++
          continue
        }
        if (seenIds.has(id.toLowerCase()) || seenEmails.has(email)) {
          skipped++
          continue
        }
        seenIds.add(id.toLowerCase())
        seenEmails.add(email)

        const existsStudent = db.prepare(`SELECT user_id FROM students WHERE lower(student_id) = lower(?)`).get(id) as
          | { user_id: string }
          | undefined
        const existsEmail = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(email) as
          | { id: string }
          | undefined
        if (existsStudent || existsEmail) {
          skipped++
          continue
        }

        const userId = randomUUID()
        const hashed = await hashPassword(passwordRaw)
        const run = db.transaction(() => {
          db.prepare(
            `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
             VALUES (?, ?, ?, 'student', 'active', ?, NULL)`
          ).run(userId, email, hashed, new Date().toISOString())
          db.prepare(
            `INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
             VALUES (?, ?, ?, ?, '', 'Freshman', 0, 0, NULL, '', '', 1)`
          ).run(userId, id, name, major)
        })
        try {
          run()
          imported++
        } catch {
          skipped++
        }
      }
      return res.json({ ok: true, imported, skipped })
    }

    const seenIds = new Set<string>()
    const seenEmails = new Set<string>()
    for (const row of data) {
      const facultyId = String(row.id || '').trim()
      const name = String(row.name || '').trim()
      const email = String(row.email || '').trim().toLowerCase()
      const department = String(row.department || 'Computer Science').trim() || 'Computer Science'
      const passwordRaw = String(row.password || '').trim()
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

      if (!facultyId || !name || !email || !passwordRaw || !emailOk) {
        skipped++
        continue
      }
      if (seenIds.has(facultyId.toLowerCase()) || seenEmails.has(email)) {
        skipped++
        continue
      }
      seenIds.add(facultyId.toLowerCase())
      seenEmails.add(email)

      const existsFaculty = db.prepare(`SELECT user_id FROM faculty WHERE lower(faculty_id) = lower(?)`).get(facultyId) as
        | { user_id: string }
        | undefined
      const existsEmail = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(email) as
        | { id: string }
        | undefined
      if (existsFaculty || existsEmail) {
        skipped++
        continue
      }

      try {
        const userId = randomUUID()
        const hashed = await hashPassword(passwordRaw)
        const run = db.transaction(() => {
          db.prepare(
            `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
             VALUES (?, ?, ?, 'faculty', 'active', ?, NULL)`
          ).run(userId, email, hashed, new Date().toISOString())
          db.prepare(
            `INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, photo_url, courses_history)
             VALUES (?, ?, ?, ?, '', '', '', '', '[]')`
          ).run(userId, facultyId, name, department)
        })
        run()
        imported++
      } catch {
        skipped++
      }
    }
    return res.json({ ok: true, imported, skipped })
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
