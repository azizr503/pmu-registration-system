import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sectionsTimeConflict } from '@/lib/schedule-utils'
import {
  getRegistrationSettings,
  listStudentSectionsForSemester,
  prereqMet,
} from '@/lib/student-helpers'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const semester = body.semester as string | undefined
    if (!semester) {
      return NextResponse.json({ error: 'semester required' }, { status: 400 })
    }

    const db = getDb()
    const settings = getRegistrationSettings(db)
    if (!settings?.is_open) {
      return NextResponse.json({ error: 'Registration is closed.' }, { status: 400 })
    }

    const cart = listStudentSectionsForSemester(db, user.id, semester, ['cart'])
    if (cart.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
    }

    const maxCredits = settings.max_credits ?? 18
    const credits = cart.reduce((s, r) => s + r.credits, 0)
    if (credits > maxCredits) {
      return NextResponse.json(
        { error: `Total credits (${credits}) exceed the maximum (${maxCredits}).` },
        { status: 400 }
      )
    }

    for (const row of cart) {
      const pr = prereqMet(db, user.id, row.course_id)
      if (!pr.ok) {
        return NextResponse.json(
          { error: `Prerequisites not met for a course in your cart (${pr.missing.join(', ')}).` },
          { status: 400 }
        )
      }
    }

    for (let i = 0; i < cart.length; i++) {
      for (let j = i + 1; j < cart.length; j++) {
        if (
          sectionsTimeConflict(
            {
              semester: cart[i].semester,
              days: cart[i].days,
              start_time: cart[i].start_time,
              end_time: cart[i].end_time,
            },
            {
              semester: cart[j].semester,
              days: cart[j].days,
              start_time: cart[j].start_time,
              end_time: cart[j].end_time,
            }
          )
        ) {
          return NextResponse.json(
            { error: 'There are time conflicts in your cart. Remove conflicting courses before confirming.' },
            { status: 400 }
          )
        }
      }
    }

    const now = new Date().toISOString()
    db.prepare(
      `UPDATE registrations SET status = 'registered', registered_at = ? WHERE user_id = ? AND semester = ? AND status = 'cart'`
    ).run(now, user.id, semester)

    const sections = db.prepare('SELECT id FROM sections').all() as { id: string }[]
    const upd = db.prepare(
      `UPDATE sections SET enrolled_count = (
        SELECT COUNT(*) FROM registrations WHERE section_id = sections.id AND status = 'registered'
      ) WHERE id = ?`
    )
    for (const s of sections) {
      upd.run(s.id)
    }

    return NextResponse.json({ ok: true, message: 'Registration confirmed.' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
