import { getDb } from '@/lib/db'
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
       WHERE g.user_id = ? AND g.is_final = 1
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
