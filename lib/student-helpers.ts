import type { Database } from 'better-sqlite3'
import { sectionsTimeConflict, type SectionTimeFields } from '@/lib/schedule-utils'

export function getRegistrationSettings(db: Database) {
  return db
    .prepare('SELECT semester_label AS semester, is_open, max_credits FROM registration_settings WHERE id = 1')
    .get() as
    | { semester: string | null; is_open: number; max_credits: number }
    | undefined
}

export function getCompletedCourseCodes(db: Database, userId: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT c.code, g.letter_grade
       FROM grades g
       JOIN sections s ON s.id = g.section_id
       JOIN courses c ON c.id = s.course_id
       WHERE g.student_id = ? AND g.is_final = 1`
    )
    .all(userId) as { code: string; letter_grade: string | null }[]

  const done = new Set<string>()
  for (const r of rows) {
    const g = (r.letter_grade || '').toUpperCase()
    if (g && g !== 'F') done.add(r.code)
  }
  return done
}

export function parsePrerequisites(json: string | null): string[] {
  if (!json) return []
  try {
    const p = JSON.parse(json) as unknown
    return Array.isArray(p) ? (p as string[]) : []
  } catch {
    return []
  }
}

export function prereqMet(
  db: Database,
  userId: string,
  courseId: string
): { ok: boolean; missing: string[] } {
  const row = db.prepare('SELECT prerequisites FROM courses WHERE id = ?').get(courseId) as
    | { prerequisites: string | null }
    | undefined
  if (!row) return { ok: true, missing: [] }
  const need = parsePrerequisites(row.prerequisites)
  if (need.length === 0) return { ok: true, missing: [] }
  const have = getCompletedCourseCodes(db, userId)
  const missing = need.filter(code => !have.has(code))
  return { ok: missing.length === 0, missing }
}

export function getSectionRow(db: Database, sectionId: string) {
  return db
    .prepare(
      `SELECT s.*, c.code AS course_code, c.title AS course_title, c.credits, c.id AS course_id, c.prerequisites,
              f.full_name AS instructor_name
       FROM sections s
       JOIN courses c ON c.id = s.course_id
       LEFT JOIN faculty f ON f.user_id = s.faculty_id
       WHERE s.id = ?`
    )
    .get(sectionId) as
    | (SectionTimeFields & {
        id: string
        course_id: string
        course_code: string
        course_title: string
        credits: number
        room: string | null
        capacity: number
        enrolled_count: number
        prerequisites: string | null
        instructor_name: string | null
      })
    | undefined
}

export function listStudentSectionsForSemester(db: Database, userId: string, semester: string, statuses: string[]) {
  const placeholders = statuses.map(() => '?').join(',')
  return db
    .prepare(
      `SELECT r.status AS reg_status, s.*, c.code AS course_code, c.title AS course_title, c.credits, c.prerequisites,
              f.full_name AS instructor_name
       FROM registrations r
       JOIN sections s ON s.id = r.section_id
       JOIN courses c ON c.id = s.course_id
       LEFT JOIN faculty f ON f.user_id = s.faculty_id
       WHERE r.student_id = ? AND r.semester = ? AND r.status IN (${placeholders})`
    )
    .all(userId, semester, ...statuses) as (SectionTimeFields & {
    id: string
    course_id: string
    course_code: string
    course_title: string
    credits: number
    prerequisites: string | null
    instructor_name: string | null
    reg_status: string
  })[]
}

export function findTimeConflictWithSet(
  candidate: SectionTimeFields & { course_code: string; id: string },
  others: (SectionTimeFields & { course_code: string; id: string })[]
): { conflict: boolean; withCode?: string } {
  for (const o of others) {
    if (o.id === candidate.id) continue
    if (sectionsTimeConflict(candidate, o)) {
      return { conflict: true, withCode: o.course_code }
    }
  }
  return { conflict: false }
}
