import Database from 'better-sqlite3'
import path from 'path'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'
import { verifyAuthToken } from '@/lib/jwt'

function openDb() {
  const dbPath = path.resolve(process.cwd(), '../backend/data/pmu.db')
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  return db
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!id?.trim()) return jsonError(400, 'User ID is required')

  const authToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!authToken) return jsonError(401, 'Authentication required')

  const claims = await verifyAuthToken(authToken)
  if (!claims) return jsonError(401, 'Invalid or expired session')
  if (claims.role !== 'admin') return jsonError(403, 'Admin access required')
  if (claims.status !== 'active') return jsonError(403, 'Inactive accounts cannot perform this action')
  if (id === claims.sub) return jsonError(400, 'You cannot delete your own account.')

  const db = openDb()
  try {
    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: string; role: 'student' | 'faculty' | 'admin' }
      | undefined

    if (!row) return jsonError(404, 'User not found')

    if (row.role === 'admin') {
      const adminCount = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).get() as { c: number })
        .c
      if (adminCount <= 1) {
        return jsonError(400, 'Cannot delete the last administrator account.')
      }
    }

    const runDelete = db.transaction(() => {
      db.prepare(`UPDATE students SET advisor_id = NULL WHERE advisor_id = ?`).run(id)
      db.prepare(`UPDATE sections SET faculty_id = NULL WHERE faculty_id = ?`).run(id)
      db.prepare(`UPDATE announcements SET created_by = NULL WHERE created_by = ?`).run(id)
      db.prepare(`UPDATE eform_requests SET reviewed_by = NULL WHERE reviewed_by = ?`).run(id)
      db.prepare(`DELETE FROM grades WHERE student_id = ?`).run(id)
      db.prepare(`DELETE FROM registrations WHERE student_id = ?`).run(id)
      db.prepare(`DELETE FROM eform_requests WHERE student_id = ?`).run(id)
      db.prepare(`DELETE FROM students WHERE user_id = ?`).run(id)
      db.prepare(`DELETE FROM faculty WHERE user_id = ?`).run(id)
      db.prepare(`DELETE FROM users WHERE id = ?`).run(id)
    })

    runDelete()
    return NextResponse.json({ ok: true, message: 'User deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    if (message.includes('SQLITE_CONSTRAINT_FOREIGNKEY') || message.includes('FOREIGN KEY')) {
      return jsonError(409, 'Cannot delete this user because related records still reference it.')
    }
    console.error('[DELETE /api/admin/users/[id]]', error)
    return jsonError(500, 'Server error while deleting user')
  } finally {
    db.close()
  }
}
