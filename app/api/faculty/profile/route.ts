import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, authCookieOptions, createSessionToken, getAuthUserById, getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const row = db
      .prepare(`SELECT f.*, u.email AS user_email FROM faculty f JOIN users u ON u.id = f.user_id WHERE f.user_id = ?`)
      .get(user.id) as Record<string, unknown> | undefined
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: { ...row, email: row.user_email },
      accountStatus: user.status,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const db = getDb()
    const cur = db.prepare(`SELECT * FROM faculty WHERE user_id = ?`).get(user.id) as Record<string, unknown> | undefined
    if (!cur) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : (cur[k] as string))

    db.prepare(
      `UPDATE faculty SET
        full_name = ?,
        department = ?,
        office_location = ?,
        office_hours = ?,
        phone = ?,
        photo_url = ?,
        courses_taught_history = ?
      WHERE user_id = ?`
    ).run(
      str('full_name'),
      str('department'),
      str('office_location'),
      str('office_hours'),
      str('phone'),
      typeof body.photo_url === 'string' ? body.photo_url : (cur.photo_url as string) ?? '',
      typeof body.courses_taught_history === 'string' ? body.courses_taught_history : (cur.courses_taught_history as string) ?? '[]',
      user.id
    )

    const fresh = getAuthUserById(user.id)
    if (!fresh) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const token = await createSessionToken(fresh)
    const res = NextResponse.json({ ok: true, user: fresh })
    res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions())
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
