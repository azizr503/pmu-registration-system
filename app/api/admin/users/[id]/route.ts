import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const status = body.status as 'active' | 'inactive' | undefined

    if (status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const db = getDb()
    const row = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: string; role: string }
      | undefined
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (row.role === 'admin' && status === 'inactive') {
      return NextResponse.json({ error: 'Cannot deactivate the last admin through this action.' }, { status: 400 })
    }

    db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
