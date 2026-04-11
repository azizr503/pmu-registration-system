import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'

export const PMU_DB_PATH = path.join(process.cwd(), 'data', 'pmu.db')
export const PMU_SCHEMA_SQL_PATH = path.join(process.cwd(), 'backend', 'db', 'schema.sql')

function readSchemaSql(): string {
  return fs.readFileSync(PMU_SCHEMA_SQL_PATH, 'utf8')
}

function tableHasColumn(db: Database.Database, table: string, col: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.some(r => r.name === col)
}

/** Rename legacy columns from pre-proposal schema so existing data/pmu.db keeps working. */
function migrateLegacySchema(db: Database.Database) {
  const tryRename = (sql: string, label: string) => {
    try {
      db.exec(sql)
    } catch (e) {
      console.warn(`[db] migrate ${label}:`, e)
    }
  }

  if (tableHasColumn(db, 'sections', 'faculty_user_id') && !tableHasColumn(db, 'sections', 'faculty_id')) {
    tryRename(`ALTER TABLE sections RENAME COLUMN faculty_user_id TO faculty_id`, 'sections.faculty_id')
  }
  if (tableHasColumn(db, 'registrations', 'user_id') && !tableHasColumn(db, 'registrations', 'student_id')) {
    tryRename(`ALTER TABLE registrations RENAME COLUMN user_id TO student_id`, 'registrations.student_id')
  }
  if (tableHasColumn(db, 'grades', 'user_id') && !tableHasColumn(db, 'grades', 'student_id')) {
    tryRename(`ALTER TABLE grades RENAME COLUMN user_id TO student_id`, 'grades.student_id')
  }
  if (
    tableHasColumn(db, 'registration_settings', 'semester') &&
    !tableHasColumn(db, 'registration_settings', 'semester_label')
  ) {
    tryRename(
      `ALTER TABLE registration_settings RENAME COLUMN semester TO semester_label`,
      'registration_settings.semester_label'
    )
  }
  if (
    tableHasColumn(db, 'faculty', 'courses_taught_history') &&
    !tableHasColumn(db, 'faculty', 'courses_history')
  ) {
    tryRename(`ALTER TABLE faculty RENAME COLUMN courses_taught_history TO courses_history`, 'faculty.courses_history')
  }

  db.exec(`DROP INDEX IF EXISTS idx_reg_user_section_sem`)
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_student_section_sem ON registrations(student_id, section_id, semester)`
  )
  db.exec(`DROP INDEX IF EXISTS idx_grades_user_section`)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_student_section ON grades(student_id, section_id)`)

  if (tableHasColumn(db, 'students', 'user_id') && !tableHasColumn(db, 'students', 'photo_url')) {
    tryRename(`ALTER TABLE students ADD COLUMN photo_url TEXT`, 'students.photo_url')
  }
  if (tableHasColumn(db, 'students', 'user_id') && !tableHasColumn(db, 'students', 'profile_completed')) {
    tryRename(`ALTER TABLE students ADD COLUMN profile_completed INTEGER DEFAULT 0`, 'students.profile_completed')
  }
  if (tableHasColumn(db, 'faculty', 'user_id') && !tableHasColumn(db, 'faculty', 'photo_url')) {
    tryRename(`ALTER TABLE faculty ADD COLUMN photo_url TEXT`, 'faculty.photo_url')
  }

  if (tableHasColumn(db, 'grades', 'student_id') && !tableHasColumn(db, 'grades', 'letter_grade')) {
    tryRename(`ALTER TABLE grades ADD COLUMN letter_grade TEXT`, 'grades.letter_grade')
  }
  if (tableHasColumn(db, 'registrations', 'student_id') && !tableHasColumn(db, 'registrations', 'attendance_pct')) {
    tryRename(
      `ALTER TABLE registrations ADD COLUMN attendance_pct REAL DEFAULT 100`,
      'registrations.attendance_pct'
    )
  }
}

function runSchema(db: Database.Database) {
  db.exec(readSchemaSql())
}

function seed(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (count.c > 0) return

  const hp = (plain: string) => bcrypt.hashSync(plain, 10)
  const now = new Date().toISOString()

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertStudent = db.prepare(`
    INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertFaculty = db.prepare(`
    INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, photo_url, courses_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, title, credits, department, description, prerequisites)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertSection = db.prepare(`
    INSERT INTO sections (id, course_id, faculty_id, semester, days, start_time, end_time, room, capacity, enrolled_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    insertUser.run('u-admin', 'admin@pmu.edu.sa', hp('admin123'), 'admin', 'active', now, null)
    insertUser.run('u-s1', 's.202012345@pmu.edu.sa', hp('student123'), 'student', 'active', now, null)
    insertUser.run('u-s2', 's.202012346@pmu.edu.sa', hp('student123'), 'student', 'active', now, null)
    insertUser.run('u-s3', 's.202012347@pmu.edu.sa', hp('student123'), 'student', 'active', now, null)
    insertUser.run('u-f1', 'f.100001@pmu.edu.sa', hp('faculty123'), 'faculty', 'active', now, null)
    insertUser.run('u-f2', 'f.100002@pmu.edu.sa', hp('faculty123'), 'faculty', 'active', now, null)

    insertStudent.run(
      'u-s1',
      '202012345',
      'Abdulaziz Alrumaih',
      'Computer Science',
      '',
      'Junior',
      3.4,
      66,
      'u-f1',
      '+966500000001',
      'Parent +966500000099',
      1
    )
    insertStudent.run(
      'u-s2',
      '202012346',
      'Abdullah Almosharef',
      'Computer Science',
      '',
      'Junior',
      3.2,
      60,
      'u-f1',
      '+966500000002',
      '',
      1
    )
    insertStudent.run(
      'u-s3',
      '202012347',
      'Rakan Almutairi',
      'Computer Science',
      '',
      'Sophomore',
      3.0,
      45,
      'u-f1',
      '',
      '',
      0
    )

    insertFaculty.run(
      'u-f1',
      '100001',
      'Dr. Ahmed Hassan',
      'Computer Science',
      'Building 3, Room 210',
      'Sun–Thu 12:00–14:00',
      '+966500000010',
      '',
      '["CS101","CS201"]'
    )
    insertFaculty.run(
      'u-f2',
      '100002',
      'Dr. Sara Al-Qahtani',
      'Mathematics',
      'Building 2, Room 105',
      'Mon/Wed 10:00–12:00',
      '+966500000011',
      '',
      '["MATH201"]'
    )

    const prereq = (codes: string[]) => JSON.stringify(codes)

    insertCourse.run('c-math101', 'MATH101', 'Calculus I', 3, 'Mathematics', 'Intro calculus', prereq([]))
    insertCourse.run('c-cs101', 'CS101', 'Programming I', 3, 'Computer Science', 'Intro programming', prereq([]))
    insertCourse.run('c-cs201', 'CS201', 'Data Structures', 3, 'Computer Science', 'DS', prereq(['CS101']))
    insertCourse.run('c-cs301', 'CS301', 'Operating Systems', 3, 'Computer Science', 'OS', prereq(['CS201']))
    insertCourse.run('c-cs401', 'CS401', 'Software Engineering', 3, 'Computer Science', 'SE', prereq(['CS301']))
    insertCourse.run('c-math201', 'MATH201', 'Calculus II', 3, 'Mathematics', 'Calculus II', prereq(['MATH101']))
    insertCourse.run('c-eng101', 'ENG101', 'English Composition', 3, 'English', 'Writing', prereq([]))

    insertSection.run(
      'sec-f25-cs101',
      'c-cs101',
      'u-f1',
      'Fall 2025',
      'Sun,Tue',
      '08:00',
      '09:30',
      'A-101',
      40,
      35
    )
    insertSection.run(
      'sec-f25-cs201',
      'c-cs201',
      'u-f1',
      'Fall 2025',
      'Sun,Tue',
      '10:00',
      '11:30',
      'B-201',
      35,
      30
    )
    insertSection.run(
      'sec-f25-eng101',
      'c-eng101',
      'u-f2',
      'Fall 2025',
      'Mon,Wed',
      '09:00',
      '10:30',
      'E-101',
      45,
      40
    )

    const sp = 'Spring 2026'
    insertSection.run('sec-sp26-cs101', 'c-cs101', 'u-f1', sp, 'Sun,Tue', '08:00', '09:30', 'A-101', 40, 0)
    insertSection.run('sec-sp26-cs201-a', 'c-cs201', 'u-f1', sp, 'Sun,Tue', '10:00', '11:30', 'B-201', 35, 0)
    insertSection.run('sec-sp26-cs201-b', 'c-cs201', 'u-f1', sp, 'Mon,Wed', '14:00', '15:30', 'B-205', 35, 0)
    insertSection.run('sec-sp26-cs301', 'c-cs301', 'u-f1', sp, 'Mon,Wed', '10:00', '11:30', 'C-301', 30, 0)
    insertSection.run('sec-sp26-cs401', 'c-cs401', 'u-f1', sp, 'Sun,Tue', '14:00', '15:30', 'C-401', 28, 0)
    insertSection.run('sec-sp26-math201', 'c-math201', 'u-f2', sp, 'Sun,Tue', '10:00', '11:30', 'M-201', 40, 0)
    insertSection.run('sec-sp26-eng101', 'c-eng101', 'u-f2', sp, 'Mon,Wed', '08:00', '09:30', 'E-101', 45, 0)

    const insertGrade = db.prepare(
      `INSERT INTO grades (id, student_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)`
    )
    insertGrade.run('g1', 'u-s1', 'sec-f25-cs101', 88, 92, 90, 90, 'A-', now)
    insertGrade.run('g2', 'u-s1', 'sec-f25-cs201', 82, 85, 80, 83.25, 'B', now)
    insertGrade.run('g3', 'u-s1', 'sec-f25-eng101', 90, 88, 92, 90, 'A-', now)

    const insertReg = db.prepare(
      `INSERT INTO registrations (id, student_id, section_id, semester, status, registered_at, attendance_pct)
       VALUES (?, ?, ?, ?, 'registered', ?, ?)`
    )
    insertReg.run('r1', 'u-s1', 'sec-sp26-cs301', sp, now, 96)
    insertReg.run('r2', 'u-s1', 'sec-sp26-eng101', sp, now, 100)
    insertReg.run('r3', 'u-s2', 'sec-sp26-cs201-a', sp, now, 92)

    db.prepare(
      `INSERT INTO announcements (id, title, content, target_role, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      'a1',
      'Spring 2026 Registration is OPEN',
      'Register early for the best schedule. Maximum 18 credit hours.',
      'student',
      'u-admin',
      now
    )
    db.prepare(
      `INSERT INTO announcements (id, title, content, target_role, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      'a2',
      'Faculty: Submit midterm grades reminder',
      'Please ensure grade submission deadlines are met for all sections.',
      'faculty',
      'u-admin',
      now
    )

    db.prepare(
      `INSERT INTO registration_settings (id, is_open, semester_label, start_date, end_date, max_credits)
       VALUES (1, 1, ?, ?, ?, 18)`
    ).run(sp, '2026-01-15', '2026-02-15')
  })

  tx()

  const sections = db.prepare('SELECT id FROM sections').all() as { id: string }[]
  const upd = db.prepare(
    `UPDATE sections SET enrolled_count = (
      SELECT COUNT(*) FROM registrations WHERE section_id = sections.id AND status = 'registered'
    ) WHERE id = ?`
  )
  for (const s of sections) {
    upd.run(s.id)
  }
}

const DEMO_ACADEMIC_SQL_PATH = path.join(process.cwd(), 'backend', 'db', 'demo-academic.sql')

/** When DB has users/courses but no sections (e.g. JSON migrate only), load demo schedule. */
function ensureAcademicSeed(db: Database.Database) {
  const secCount = (db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }).c
  if (secCount > 0) return
  db.exec(fs.readFileSync(DEMO_ACADEMIC_SQL_PATH, 'utf8'))
}

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  try {
    const dir = path.join(process.cwd(), 'data')
    fs.mkdirSync(dir, { recursive: true })
    const db = new Database(PMU_DB_PATH)
    db.pragma('journal_mode = WAL')
    runSchema(db)
    migrateLegacySchema(db)
    seed(db)
    ensureAcademicSeed(db)
    dbInstance = db
    return db
  } catch (err) {
    console.error('[getDb] Failed to open or initialize database:', err)
    throw err
  }
}
