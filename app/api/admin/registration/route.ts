import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const settings = db.prepare(`SELECT * FROM registration_settings WHERE id = 1`).get()
    const stats = db
      .prepare(
        `SELECT semester, COUNT(*) as c FROM registrations WHERE status = 'registered' GROUP BY semester`
      )
      .all()

    return NextResponse.json({ settings, stats })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { semester, is_open, start_date, end_date, max_credits } = body as {
      semester?: string
      is_open?: boolean
      start_date?: string
      end_date?: string
      max_credits?: number
    }

    const db = getDb()
    db.prepare(
      `UPDATE registration_settings SET
        semester = COALESCE(?, semester),
        is_open = COALESCE(?, is_open),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        max_credits = COALESCE(?, max_credits)
      WHERE id = 1`
    ).run(
      semester ?? null,
      typeof is_open === 'boolean' ? (is_open ? 1 : 0) : null,
      start_date ?? null,
      end_date ?? null,
      max_credits ?? null
    )

    const settings = db.prepare(`SELECT * FROM registration_settings WHERE id = 1`).get()
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
