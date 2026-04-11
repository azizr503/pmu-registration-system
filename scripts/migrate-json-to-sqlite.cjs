/**
 * One-time / CI: apply backend/db/schema.sql and import data/users.json + data/courses.json
 * when tables are empty. Safe to re-run (skips if users already exist).
 *
 * Usage: npm run db:migrate
 */
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const root = path.join(__dirname, '..')
const dbPath = path.join(root, 'data', 'pmu.db')
const schemaPath = path.join(root, 'backend', 'db', 'schema.sql')
const usersPath = path.join(root, 'data', 'users.json')
const coursesPath = path.join(root, 'data', 'courses.json')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

const schema = fs.readFileSync(schemaPath, 'utf8')
db.exec(schema)

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c
if (userCount > 0) {
  console.log('Database already has users; skipping JSON import.')
  db.close()
  process.exit(0)
}

const usersDoc = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
const coursesDoc = JSON.parse(fs.readFileSync(coursesPath, 'utf8'))

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, role, status, created_at, last_login)
  VALUES (@id, @email, @password_hash, @role, @status, @created_at, @last_login)
`)

const insertStudent = db.prepare(`
  INSERT INTO students (user_id, student_id, full_name, major, minor, level, gpa, credits_completed, advisor_id, phone, emergency_contact, profile_completed)
  VALUES (@user_id, @student_id, @full_name, @major, @minor, @level, @gpa, @credits_completed, @advisor_id, @phone, @emergency_contact, @profile_completed)
`)

const insertFaculty = db.prepare(`
  INSERT INTO faculty (user_id, faculty_id, full_name, department, office_location, office_hours, phone, photo_url, courses_history)
  VALUES (@user_id, @faculty_id, @full_name, @department, @office_location, @office_hours, @phone, @photo_url, @courses_history)
`)

const insertCourse = db.prepare(`
  INSERT INTO courses (id, code, title, credits, department, description, prerequisites)
  VALUES (@id, @code, @title, @credits, @department, @description, @prerequisites)
`)

const tx = db.transaction(() => {
  for (const u of usersDoc.users) {
    insertUser.run({
      id: u.id,
      email: u.email,
      password_hash: u.password_hash,
      role: u.role,
      status: u.status || 'active',
      created_at: u.created_at || new Date().toISOString(),
      last_login: u.last_login ?? null,
    })
  }
  for (const s of usersDoc.students || []) {
    insertStudent.run({
      user_id: s.user_id,
      student_id: s.student_id,
      full_name: s.full_name,
      major: s.major ?? 'Computer Science',
      minor: s.minor ?? '',
      level: s.level ?? 'Junior',
      gpa: s.gpa ?? 0,
      credits_completed: s.credits_completed ?? 0,
      advisor_id: s.advisor_id ?? null,
      phone: s.phone ?? '',
      emergency_contact: s.emergency_contact ?? '',
      profile_completed: s.profile_completed ?? 0,
    })
  }
  for (const f of usersDoc.faculty || []) {
    insertFaculty.run({
      user_id: f.user_id,
      faculty_id: f.faculty_id,
      full_name: f.full_name,
      department: f.department ?? 'Computer Science',
      office_location: f.office_location ?? '',
      office_hours: f.office_hours ?? '',
      phone: f.phone ?? '',
      photo_url: f.photo_url ?? '',
      courses_history: f.courses_history ?? '[]',
    })
  }
  for (const c of coursesDoc.courses || []) {
    insertCourse.run({
      id: c.id,
      code: c.code,
      title: c.title,
      credits: c.credits ?? 3,
      department: c.department ?? 'Computer Science',
      description: c.description ?? '',
      prerequisites: typeof c.prerequisites === 'string' ? c.prerequisites : JSON.stringify(c.prerequisites || []),
    })
  }
})

tx()

const demoAcademicPath = path.join(root, 'backend', 'db', 'demo-academic.sql')
const sectionsAfter = db.prepare('SELECT COUNT(*) as c FROM sections').get().c
if (sectionsAfter === 0 && fs.existsSync(demoAcademicPath)) {
  db.exec(fs.readFileSync(demoAcademicPath, 'utf8'))
  console.log('Applied backend/db/demo-academic.sql (sections, grades, registrations, settings).')
}

console.log(
  `Imported ${usersDoc.users.length} users, ${(usersDoc.students || []).length} students, ${(usersDoc.faculty || []).length} faculty, ${(coursesDoc.courses || []).length} courses.`
)
db.close()
