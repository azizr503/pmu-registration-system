import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'

/** Legacy shape for student-profile and profile/complete pages. */
export const profileRouter = Router()
profileRouter.use(requireAuth)
profileRouter.use(requireRole('student'))

profileRouter.get('/', (req, res) => {
  try {
    const authUser = req.authUser!
    const db = getDb()
    const st = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(authUser.id) as
      | Record<string, unknown>
      | undefined

    if (!st) {
      return res.status(404).json({ error: 'User not found' })
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
         WHERE g.student_id = ? AND g.is_final = 1`
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
      completedCredits:
        typeof st.credits_completed === 'number' ? st.credits_completed : Number(st.credits_completed) || 0,
      requiredCredits: 120,
      academicStanding: 'Good Standing',
      completedCourses: completedCodes.map(c => c.code),
    }

    return res.json({ profile })
  } catch (error) {
    console.error('Get profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

profileRouter.post('/', (req, res) => {
  try {
    const authUser = req.authUser!
    const body = req.body || {}
    const { firstName, lastName, phone, major, minor } = body as Record<string, unknown>

    const full_name =
      typeof firstName === 'string' && typeof lastName === 'string'
        ? `${firstName.trim()} ${lastName.trim()}`.trim()
        : undefined

    const db = getDb()
    const cur = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(authUser.id) as
      | Record<string, unknown>
      | undefined
    if (!cur) {
      return res.status(404).json({ error: 'User not found' })
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

    return res.json({
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})
