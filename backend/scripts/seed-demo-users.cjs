/**
 * Updates demo account passwords (run after the app has created data/pmu.db at least once).
 * Usage: npm run db:seed
 */
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'pmu.db')

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath)
  console.error('Start the Next.js app once (npm run dev) to create the database, then run this script again.')
  process.exit(1)
}

const db = new Database(dbPath)

const accounts = [
  ['admin@pmu.edu.sa', 'admin123'],
  ['s.202012345@pmu.edu.sa', 'student123'],
  ['f.100001@pmu.edu.sa', 'faculty123'],
]

const upd = db.prepare('UPDATE users SET password_hash = ? WHERE lower(email) = lower(?)')

console.log('Updating demo passwords...')
for (const [email, plain] of accounts) {
  const hash = bcrypt.hashSync(plain, 10)
  const r = upd.run(hash, email)
  if (r.changes === 0) {
    console.warn('  No row for', email, '(create DB with app seed first)')
  } else {
    console.log('  OK', email)
  }
}

db.close()
console.log('Done.')
