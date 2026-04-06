import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'

let dbInstance: Database.Database | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','faculty','admin')),
  status TEXT NOT NULL CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS students (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  major TEXT,
  minor TEXT,
  level TEXT,
  gpa REAL DEFAULT 0,
  credits_completed INTEGER DEFAULT 0,
  advisor_id TEXT,
  phone TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  profile_completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faculty (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  faculty_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  office_location TEXT,
  office_hours TEXT,
  phone TEXT,
  photo_url TEXT,
  courses_taught_history TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL,
  department TEXT,
  description TEXT,
  prerequisites TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  faculty_user_id TEXT REFERENCES users(id),
  semester TEXT NOT NULL,
  days TEXT,
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  capacity INTEGER,
  enrolled_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  semester TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cart','registered','dropped','waitlisted')),
  registered_at TEXT,
  attendance_pct REAL DEFAULT 100
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_user_section_sem
  ON registrations(user_id, section_id, semester);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  midterm REAL,
  final REAL,
  assignment REAL,
  calculated_grade REAL,
  override_grade TEXT,
  letter_grade TEXT,
  submitted_at TEXT,
  is_final INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_user_section ON grades(user_id, section_id);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS registration_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  semester TEXT,
  is_open INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  max_credits INTEGER DEFAULT 18
);
`

function runSchema(db: Database.Database) {
  db.exec(SCHEMA)
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
    INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, courses_taught_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, title, credits, department, description, prerequisites)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertSection = db.prepare(`
    INSERT INTO sections (id, course_id, faculty_user_id, semester, days, start_time, end_time, room, capacity, enrolled_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    // Users
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
      '["MATH201"]'
    )

    const prereq = (codes: string[]) => JSON.stringify(codes)

    insertCourse.run(
      'c-math101',
      'MATH101',
      'Calculus I',
      3,
      'Mathematics',
      'Intro calculus',
      prereq([])
    )
    insertCourse.run('c-cs101', 'CS101', 'Programming I', 3, 'Computer Science', 'Intro programming', prereq([]))
    insertCourse.run('c-cs201', 'CS201', 'Data Structures', 3, 'Computer Science', 'DS', prereq(['CS101']))
    insertCourse.run('c-cs301', 'CS301', 'Operating Systems', 3, 'Computer Science', 'OS', prereq(['CS201']))
    insertCourse.run('c-cs401', 'CS401', 'Software Engineering', 3, 'Computer Science', 'SE', prereq(['CS301']))
    insertCourse.run(
      'c-math201',
      'MATH201',
      'Calculus II',
      3,
      'Mathematics',
      'Calculus II',
      prereq(['MATH101'])
    )
    insertCourse.run('c-eng101', 'ENG101', 'English Composition', 3, 'English', 'Writing', prereq([]))

    // Fall 2025 sections (for grades)
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

    // Spring 2026 — current registration
    const sp = 'Spring 2026'
    insertSection.run('sec-sp26-cs101', 'c-cs101', 'u-f1', sp, 'Sun,Tue', '08:00', '09:30', 'A-101', 40, 0)
    insertSection.run('sec-sp26-cs201-a', 'c-cs201', 'u-f1', sp, 'Sun,Tue', '10:00', '11:30', 'B-201', 35, 0)
    insertSection.run('sec-sp26-cs201-b', 'c-cs201', 'u-f1', sp, 'Mon,Wed', '14:00', '15:30', 'B-205', 35, 0)
    insertSection.run('sec-sp26-cs301', 'c-cs301', 'u-f1', sp, 'Mon,Wed', '10:00', '11:30', 'C-301', 30, 0)
    insertSection.run('sec-sp26-cs401', 'c-cs401', 'u-f1', sp, 'Sun,Tue', '14:00', '15:30', 'C-401', 28, 0)
    insertSection.run('sec-sp26-math201', 'c-math201', 'u-f2', sp, 'Sun,Tue', '10:00', '11:30', 'M-201', 40, 0)
    insertSection.run('sec-sp26-eng101', 'c-eng101', 'u-f2', sp, 'Mon,Wed', '08:00', '09:30', 'E-101', 45, 0)

    const insertGrade = db.prepare(
      `INSERT INTO grades (id, user_id, section_id, midterm, final, assignment, calculated_grade, letter_grade, submitted_at, is_final)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    insertGrade.run('g1', 'u-s1', 'sec-f25-cs101', 88, 92, 90, 90, 'A-', now)
    insertGrade.run('g2', 'u-s1', 'sec-f25-cs201', 82, 85, 80, 83.25, 'B', now)
    insertGrade.run('g3', 'u-s1', 'sec-f25-eng101', 90, 88, 92, 90, 'A-', now)

    const insertReg = db.prepare(
      `INSERT INTO registrations (id, user_id, section_id, semester, status, registered_at, attendance_pct)
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
      `INSERT INTO registration_settings (id, semester, is_open, start_date, end_date, max_credits)
       VALUES (1, ?, 1, ?, ?, 18)`
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

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  try {
    const dir = path.join(process.cwd(), 'data')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'pmu.db')
    const db = new Database(file)
    db.pragma('journal_mode = WAL')
    runSchema(db)
    seed(db)
    dbInstance = db
    return db
  } catch (err) {
    console.error('[getDb] Failed to open or initialize database:', err)
    throw err
  }
}
