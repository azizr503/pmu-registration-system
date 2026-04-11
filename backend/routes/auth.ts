import { randomUUID } from 'crypto'
import { Router } from 'express'
import {
  createSessionToken,
  hashPassword,
  inferRoleFromEmail,
  isValidPMUEmail,
  verifyPassword,
} from '@/lib/auth'
import { normalizePmuEmail } from '@/lib/email-normalize'
import { getCredentialByEmail, touchLastLogin } from '../auth/user-service'
import { attachAuthCookie, clearAuthCookie } from '../cookies'
import { requireAuth } from '../middleware/auth'
import { getDb } from '../db'

const INACTIVE_MSG = 'Account not activated. Please contact IT Support.'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const logPrefix = '[auth/login]'
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string }
    if (!email || !password) {
      console.warn(`${logPrefix} missing credentials`)
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const emailNorm = normalizePmuEmail(String(email))
    if (!isValidPMUEmail(emailNorm)) {
      console.warn(`${logPrefix} invalid email domain`, { email: emailNorm })
      return res.status(400).json({ error: 'Please use a valid PMU email address (@pmu.edu.sa)' })
    }

    let cred: Awaited<ReturnType<typeof getCredentialByEmail>> = null
    try {
      cred = getCredentialByEmail(emailNorm)
    } catch (dbErr) {
      console.error(`${logPrefix} database error`, dbErr)
      if (dbErr instanceof Error && dbErr.stack) console.error(dbErr.stack)
      return res.status(503).json({ error: 'Unable to reach the login service. Please try again shortly.' })
    }

    if (!cred) {
      console.warn(`${logPrefix} no user or lookup failed`, { email: emailNorm })
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (cred.user.status !== 'active') {
      console.warn(`${logPrefix} inactive account`, { userId: cred.user.id })
      return res.status(403).json({ error: INACTIVE_MSG })
    }

    let ok = false
    try {
      ok = await verifyPassword(String(password), cred.password_hash)
    } catch (e) {
      console.error(`${logPrefix} bcrypt error`, e)
      if (e instanceof Error && e.stack) console.error(e.stack)
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!ok) {
      console.warn(`${logPrefix} bad password`, { userId: cred.user.id })
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    try {
      touchLastLogin(cred.user.id)
    } catch (e) {
      console.warn(`${logPrefix} touchLastLogin:`, e)
    }

    let token: string
    try {
      token = await createSessionToken(cred.user)
    } catch (e) {
      console.error(`${logPrefix} JWT sign error`, e)
      if (e instanceof Error && e.stack) console.error(e.stack)
      return res.status(500).json({ error: 'Unable to complete sign-in. Please try again.' })
    }

    attachAuthCookie(res, token)
    console.info(`${logPrefix} success`, { userId: cred.user.id, role: cred.user.role })
    return res.json({ message: 'Login successful', user: cred.user })
  } catch (error) {
    console.error(`${logPrefix} unexpected error`, error)
    if (error instanceof Error && error.stack) console.error(error.stack)
    return res.status(500).json({ error: 'Unable to sign in. Please try again.' })
  }
})

authRouter.post('/register', async (req, res) => {
  try {
    const body = req.body || {}
    const { email, password, firstName, lastName } = body as Record<string, unknown>

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const emailNorm = normalizePmuEmail(String(email))
    if (!isValidPMUEmail(emailNorm)) {
      return res.status(400).json({ error: 'Please use a valid PMU email address (@pmu.edu.sa)' })
    }

    const inferred = inferRoleFromEmail(emailNorm)
    if (!inferred || inferred.role !== 'student' || !inferred.studentId) {
      return res.status(400).json({
        error:
          'Self-registration is only available for PMU student IDs (s.XXXXXXX@pmu.edu.sa). Faculty and staff accounts are created by IT.',
      })
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(emailNorm) as
      | { id: string }
      | undefined
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    const id = randomUUID()
    const hashedPassword = await hashPassword(String(password))
    const now = new Date().toISOString()
    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim()

    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
         VALUES (?, ?, ?, 'student', 'inactive', ?, NULL)`
      ).run(id, emailNorm, hashedPassword, now)

      db.prepare(
        `INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
         VALUES (?, ?, ?, 'Undeclared', '', 'Freshman', 0, 0, NULL, '', '', 0)`
      ).run(id, inferred.studentId, fullName)
    })
    run()

    return res.status(201).json({
      message:
        'Registration received. Your account must be activated by an administrator before you can sign in.',
      pendingActivation: true,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  return res.status(200).json({ message: 'Logout successful' })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.authUser!
    const token = await createSessionToken(user)
    attachAuthCookie(res, token)
    return res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})
