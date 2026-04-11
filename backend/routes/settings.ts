import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'

export const settingsRouter = Router()

settingsRouter.get('/registration-settings', requireAuth, (req, res) => {
  try {
    const db = getDb()
    const settings = db
      .prepare(
        `SELECT id, is_open, semester_label AS semester, start_date, end_date, max_credits FROM registration_settings WHERE id = 1`
      )
      .get()
    return res.json({ settings })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

settingsRouter.put('/registration-settings', requireAuth, requireRole('admin'), (req, res) => {
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

settingsRouter.get('/announcements', (_req, res) => {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT id, title, content, target_role, created_at FROM announcements
         WHERE target_role IN ('all','student') ORDER BY created_at DESC LIMIT 24`
      )
      .all()
    return res.json({ announcements: rows })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})
