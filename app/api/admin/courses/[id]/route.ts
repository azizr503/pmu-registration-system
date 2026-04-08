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
    const { code, title, credits, department, description, prerequisites } = body as {
      code?: string
      title?: string
      credits?: number
      department?: string
      description?: string
      prerequisites?: string[]
    }

    const db = getDb()
    const cur = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(id) as { id: string } | undefined
    if (!cur) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const row = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(id) as Record<string, unknown>
    const prereqStr =
      prerequisites != null ? JSON.stringify(prerequisites) : (row.prerequisites as string) ?? '[]'

    db.prepare(
      `UPDATE courses SET
        code = COALESCE(?, code),
        title = COALESCE(?, title),
        credits = COALESCE(?, credits),
        department = COALESCE(?, department),
        description = COALESCE(?, description),
        prerequisites = COALESCE(?, prerequisites)
      WHERE id = ?`
    ).run(
      code ?? null,
      title ?? null,
      credits ?? null,
      department ?? null,
      description ?? null,
      prerequisites != null ? prereqStr : null,
      id
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const db = getDb()
    const cur = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(id) as { id: string } | undefined
    if (!cur) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const run = db.transaction(() => {
      const sectionIds = db.prepare(`SELECT id FROM sections WHERE course_id = ?`).all(id) as { id: string }[]
      for (const s of sectionIds) {
        db.prepare(`DELETE FROM grades WHERE section_id = ?`).run(s.id)
        db.prepare(`DELETE FROM registrations WHERE section_id = ?`).run(s.id)
      }
      db.prepare(`DELETE FROM sections WHERE course_id = ?`).run(id)
      db.prepare(`DELETE FROM courses WHERE id = ?`).run(id)
    })
    run()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
