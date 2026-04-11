import { getDb } from '../db'
import { listStudentSectionsForSemester } from '@/lib/student-helpers'

export function buildStudentChatContext(userId: string, semester: string): string {
  const db = getDb()
  const st = db.prepare(`SELECT full_name, student_id, major, gpa, credits_completed FROM students WHERE user_id = ?`).get(userId) as
    | { full_name: string; student_id: string; major: string; gpa: number; credits_completed: number }
    | undefined

  const regs = listStudentSectionsForSemester(db, userId, semester, ['registered', 'cart'])
  const grades = db
    .prepare(
      `SELECT c.code, c.title, c.credits, g.letter_grade, g.override_grade, g.calculated_grade, s.semester
       FROM grades g
       JOIN sections s ON s.id = g.section_id
       JOIN courses c ON c.id = s.course_id
       WHERE g.student_id = ? AND g.is_final = 1
       ORDER BY s.semester DESC, c.code`
    )
    .all(userId) as {
      code: string
      title: string
      credits: number
      letter_grade: string | null
      override_grade: string | null
      calculated_grade: number | null
      semester: string
    }[]

  return JSON.stringify(
    {
      student: st,
      semester,
      registrations: regs.map(r => ({
        code: r.course_code,
        title: r.course_title,
        status: r.reg_status,
        days: r.days,
        time: `${r.start_time}-${r.end_time}`,
      })),
      completedGrades: grades.map(g => ({
        code: g.code,
        title: g.title,
        credits: g.credits,
        semester: g.semester,
        letterGrade: g.override_grade || g.letter_grade,
        numericGrade: g.calculated_grade,
      })),
    },
    null,
    2
  )
}

export function buildAdminChatContext(): string {
  const db = getDb()
  const settings = db
    .prepare(
      `SELECT id, is_open, semester_label AS semester, start_date, end_date, max_credits FROM registration_settings WHERE id = 1`
    )
    .get() as {
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
        `SELECT COUNT(DISTINCT student_id) as c FROM registrations WHERE semester = ? AND status = 'registered'`
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
             WHERE r.student_id = u.id AND r.semester = ? AND r.status = 'registered'
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

  const inactiveUsers = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE status = 'inactive'`).get() as { c: number }).c

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
