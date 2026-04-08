'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function FacultyCoursesPage() {
  const [data, setData] = useState<{
    semester: string
    courses: {
      id: string
      code: string
      title: string
      semester: string
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      enrolled_count: number
      capacity: number
      grades_submitted: number
    }[]
  } | null>(null)

  useEffect(() => {
    void (async () => {
      const r = await fetch('/api/faculty/courses')
      const d = await r.json()
      if (r.ok) setData(d)
    })()
  }, [])

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">My Courses — {data.semester}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {data.courses.map((c, idx) => {
          const fillPct = Math.round((c.enrolled_count / Math.max(1, c.capacity)) * 100)
          const fillColor = fillPct > 50 ? 'bg-emerald-500' : fillPct >= 20 ? 'bg-amber-500' : 'bg-red-500'
          return (
          <Card key={c.id} className="border-l-4 border-l-[#1a5fb4]">
            <CardHeader>
              <CardTitle className="text-lg">
                {c.code} — {c.title}
              </CardTitle>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-[#1a5fb4]/10 px-2 py-0.5 font-medium text-[#1a5fb4]">
                  Section {String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    c.grades_submitted ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {c.grades_submitted ? 'Closed' : 'Active'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Schedule: {c.days || '—'} {c.start_time && c.end_time ? `${c.start_time}–${c.end_time}` : ''}
              </p>
              <p>Room: {c.room || '—'}</p>
              <p>
                Enrolled: {c.enrolled_count} / {c.capacity}
              </p>
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${fillColor}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{fillPct}% full</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline" className="border-[#1a5fb4] text-[#1a5fb4]">
                  <Link href={`/faculty/roster/${c.id}`}>View Roster</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
                  <Link href={`/faculty/grades/${c.id}`}>Submit Grades</Link>
                </Button>
                <Button size="sm" variant="secondary" disabled>
                  Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  )
}
