import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createSessionToken,
  getAuthUserById,
  getUserFromRequest,
} from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const row = db
      .prepare(
        `SELECT s.*, u.email AS user_email FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id = ?`
      )
      .get(user.id) as Record<string, unknown> | undefined

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        ...row,
        email: row.user_email,
        accountStatus: user.status,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const db = getDb()
    const cur = db.prepare(`SELECT * FROM students WHERE user_id = ?`).get(user.id) as
      | Record<string, unknown>
      | undefined
    if (!cur) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : (cur[k] as string))
    const markComplete = body.markComplete === true || body.profile_completed === true

    const profile_completed = markComplete ? 1 : (cur.profile_completed as number) ? 1 : 0

    db.prepare(
      `UPDATE students SET
        full_name = ?,
        major = ?,
        minor = ?,
        level = ?,
        phone = ?,
        emergency_contact = ?,
        photo_url = ?,
        profile_completed = ?
      WHERE user_id = ?`
    ).run(
      str('full_name'),
      str('major'),
      str('minor'),
      str('level'),
      str('phone'),
      str('emergency_contact'),
      typeof body.photo_url === 'string' ? body.photo_url : (cur.photo_url as string | null) ?? '',
      profile_completed,
      user.id
    )

    const fresh = getAuthUserById(user.id)
    if (!fresh) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
