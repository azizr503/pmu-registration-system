import { Router } from 'express'
import { getDb } from '../db'

export const coursesRouter = Router()

coursesRouter.get('/', (_req, res) => {
  try {
    const db = getDb()
    const courses = db.prepare('SELECT * FROM courses ORDER BY code').all()
    return res.json({ courses })
  } catch (error) {
    console.error('Courses error:', error)
    return res.status(500).json({ error: 'Unable to fetch courses' })
  }
})
