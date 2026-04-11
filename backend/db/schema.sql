-- PMU Registration — SQLite schema (project proposal + app extensions).
-- See backend/db/database.ts for migrations from older column names.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','faculty','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS students (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  major TEXT DEFAULT 'Computer Science',
  minor TEXT DEFAULT '',
  level TEXT DEFAULT 'Junior',
  gpa REAL DEFAULT 0.0,
  credits_completed INTEGER DEFAULT 0,
  advisor_id TEXT,
  phone TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  photo_url TEXT,
  profile_completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faculty (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  faculty_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT DEFAULT 'Computer Science',
  office_location TEXT DEFAULT '',
  office_hours TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  photo_url TEXT,
  courses_history TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER DEFAULT 3,
  department TEXT DEFAULT 'Computer Science',
  description TEXT DEFAULT '',
  prerequisites TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  faculty_id TEXT REFERENCES users(id),
  semester TEXT NOT NULL,
  days TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT NOT NULL,
  capacity INTEGER DEFAULT 35,
  enrolled_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  semester TEXT NOT NULL,
  status TEXT DEFAULT 'registered' CHECK(status IN ('registered','dropped','waitlisted','cart')),
  registered_at TEXT DEFAULT (datetime('now')),
  attendance_pct REAL DEFAULT 100
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_student_section_sem
  ON registrations(student_id, section_id, semester);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_student_section ON grades(student_id, section_id);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT DEFAULT 'all',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registration_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_open INTEGER DEFAULT 1,
  semester_label TEXT DEFAULT 'Spring 2026',
  start_date TEXT,
  end_date TEXT,
  max_credits INTEGER DEFAULT 18
);
