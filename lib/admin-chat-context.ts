import { getDb } from '@/lib/db'

/** JSON context for admin AI — real DB stats for current semester. */
export function buildAdminChatContext(): string {
  const db = getDb()
  const settings = db.prepare(`SELECT * FROM registration_settings WHERE id = 1`).get() as {
    semester: string | null
    is_open: number
    start_date: string | null
    end_date: string | null
    max_credits: number
  } | null

  const semester = settings?.semester || 'Spring 2026'

  const totalStudents = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'student'`).get() as { c: number }).c
  const totalFaculty = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'faculty'`).get() as { c: number }).c
  const totalAdmins = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as { c: number }).c

  const registeredThisSemester = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) as c FROM registrations WHERE semester = ? AND status = 'registered'`
      )
      .get(semester) as { c: number }
  ).c

  const studentsNotRegisteredThisSemester = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM users u
         WHERE u.role = 'student'
           AND NOT EXISTS (
             SELECT 1 FROM registrations r
             WHERE r.user_id = u.id AND r.semester = ? AND r.status = 'registered'
           )`
      )
      .get(semester) as { c: number }
  ).c

  const lowEnrollment = db
    .prepare(
      `SELECT c.code, c.title, s.enrolled_count, s.capacity
       FROM sections s
       JOIN courses c ON c.id = s.course_id
       WHERE s.semester = ? AND s.capacity > 0 AND (s.enrolled_count * 1.0 / s.capacity) < 0.2
       ORDER BY (s.enrolled_count * 1.0 / s.capacity) ASC
       LIMIT 12`
    )
    .all(semester) as { code: string; title: string; enrolled_count: number; capacity: number }[]

  const popular = db
    .prepare(
      `SELECT c.code, c.title, s.enrolled_count, s.capacity
       FROM sections s
       JOIN courses c ON c.id = s.course_id
       WHERE s.semester = ?
       ORDER BY s.enrolled_count DESC
       LIMIT 1`
    )
    .get(semester) as { code: string; title: string; enrolled_count: number; capacity: number } | undefined

  const loggedInToday = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM users
         WHERE last_login IS NOT NULL AND date(last_login) = date('now')`
      )
      .get() as { c: number }
  ).c

  const inactiveUsers = (
    db.prepare(`SELECT COUNT(*) as c FROM users WHERE status = 'inactive'`).get() as { c: number }
  ).c

  const payload = {
    registrationSettings: settings,
    currentSemester: semester,
    counts: {
      totalStudents,
      totalFaculty,
      totalAdmins,
      registeredStudentsThisSemester: registeredThisSemester,
      studentsNotRegisteredThisSemester,
      inactiveUsers,
      usersLoggedInToday: loggedInToday,
    },
    lowEnrollmentSections: lowEnrollment,
    mostPopularSectionThisSemester: popular ?? null,
  }

  return JSON.stringify(payload, null, 2)
}
