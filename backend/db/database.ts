import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'

const BACKEND_ROOT = path.resolve(__dirname, '..')

export const PMU_DB_PATH = path.join(BACKEND_ROOT, 'data', 'pmu.db')
export const PMU_SCHEMA_SQL_PATH = path.join(BACKEND_ROOT, 'db', 'schema.sql')

function readSchemaSql(): string {
  return fs.readFileSync(PMU_SCHEMA_SQL_PATH, 'utf8')
}

const PMU_COURSE_CATALOG_PATH = path.join(BACKEND_ROOT, 'db', 'pmu-course-catalog.json')

type CatalogCourse = {
  code: string
  title: string
  credits: number
  department: string
  prerequisites: string[]
}

function loadCourseCatalog(): CatalogCourse[] {
  const raw = fs.readFileSync(PMU_COURSE_CATALOG_PATH, 'utf8')
  return JSON.parse(raw) as CatalogCourse[]
}

function courseId(code: string) {
  return `c-${code}`
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
      '["GEIT1411","GEIT1412","COSC3351","COSC4361"]'
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
      '["MATH1422","MATH1423","MATH2313"]'
    )

    db.exec(`DELETE FROM grades`)
    db.exec(`DELETE FROM registrations`)
    db.exec(`DELETE FROM sections`)
    db.exec(`DELETE FROM courses`)

    const catalog = loadCourseCatalog()
    for (const c of catalog) {
      insertCourse.run(
        courseId(c.code),
        c.code,
        c.title,
        c.credits,
        c.department,
        '',
        JSON.stringify(c.prerequisites)
      )
    }

    const sp = 'Spring 2026'
    const fall = 'Fall 2025'
    const demoFaculty = 'u-f1'

    const springSections: [string, string, string, string, string][] = [
      ['GEIT1411', 'Sun,Tue', '08:00', '09:30', 'GEIT-A101'],
      ['GEIT1412', 'Sun,Tue', '10:00', '11:30', 'GEIT-A102'],
      ['GEIT2421', 'Mon,Wed', '08:00', '09:30', 'GEIT-B201'],
      ['GEIT2331', 'Mon,Wed', '10:00', '11:30', 'GEIT-B202'],
      ['GEIT3341', 'Sun,Tue', '14:00', '15:30', 'GEIT-C301'],
      ['GEIT3331', 'Mon,Wed', '14:00', '15:30', 'GEIT-C302'],
      ['GEIT3351', 'Tue,Thu', '08:00', '09:30', 'GEIT-D401'],
      ['MATH1422', 'Sun,Tue', '12:00', '13:30', 'MATH-M101'],
      ['MATH1423', 'Mon,Wed', '12:00', '13:30', 'MATH-M102'],
      ['MATH2313', 'Tue,Thu', '10:00', '11:30', 'MATH-M201'],
      ['COSC3351', 'Sun,Tue', '16:00', '17:30', 'COSC-LAB1'],
      ['COSC4361', 'Mon,Wed', '16:00', '17:30', 'COSC-LAB2'],
      ['COSC4362', 'Tue,Thu', '14:00', '15:30', 'COSC-AI01'],
    ]
    for (const [code, days, st, en, room] of springSections) {
      insertSection.run(`sec-sp26-${code}`, courseId(code), demoFaculty, sp, days, st, en, room, 35, 0)
    }

    const fallSections: [string, string, string, string, string, string][] = [
      ['GEIT1411', 'u-f1', 'Sun,Tue', '08:00', '09:30', 'GEIT-A101'],
      ['GEIT1412', 'u-f1', 'Sun,Tue', '10:00', '11:30', 'GEIT-A102'],
      ['COMM1311', 'u-f2', 'Mon,Wed', '09:00', '10:30', 'COMM-E101'],
    ]
    for (const [code, fid, days, st, en, room] of fallSections) {
      insertSection.run(`sec-f25-${code}`, courseId(code), fid, fall, days, st, en, room, 35, 28)
    }

    const insertGrade = db.prepare(
      `INSERT INTO grades (id, student_id, section_id, midterm, final, assignment, calculated_grade, override_grade, letter_grade, submitted_at, is_final)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)`
    )
    insertGrade.run('g1', 'u-s1', 'sec-f25-GEIT1411', 88, 92, 90, 90, 'A-', now)
    insertGrade.run('g2', 'u-s1', 'sec-f25-GEIT1412', 82, 85, 80, 83.25, 'B', now)
    insertGrade.run('g3', 'u-s1', 'sec-f25-COMM1311', 90, 88, 92, 90, 'A-', now)

    const insertReg = db.prepare(
      `INSERT INTO registrations (id, student_id, section_id, semester, status, registered_at, attendance_pct)
       VALUES (?, ?, ?, ?, 'registered', ?, ?)`
    )
    insertReg.run('r1', 'u-s1', 'sec-sp26-COSC4361', sp, now, 96)
    insertReg.run('r2', 'u-s1', 'sec-sp26-COSC4362', sp, now, 100)
    insertReg.run('r3', 'u-s2', 'sec-sp26-GEIT2421', sp, now, 92)

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

const DEMO_ACADEMIC_SQL_PATH = path.join(BACKEND_ROOT, 'db', 'demo-academic.sql')

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
    const dir = path.join(BACKEND_ROOT, 'data')
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
