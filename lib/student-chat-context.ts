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
      `SELECT c.code, g.letter_grade, s.semester FROM grades g
       JOIN sections s ON s.id = g.section_id
       JOIN courses c ON c.id = s.course_id
       WHERE g.user_id = ? AND g.is_final = 1`
    )
    .all(userId) as { code: string; letter_grade: string | null; semester: string }[]

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
      completedGrades: grades,
    },
    null,
    2
  )
}
