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
      days: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      enrolled_count: number
      capacity: number
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
        {data.courses.map(c => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {c.code} — {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Schedule: {c.days || '—'} {c.start_time && c.end_time ? `${c.start_time}–${c.end_time}` : ''}
              </p>
              <p>Room: {c.room || '—'}</p>
              <p>
                Enrolled: {c.enrolled_count} / {c.capacity}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/faculty/roster/${c.id}`}>View Roster</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#1a5fb4]">
                  <Link href={`/faculty/grades/${c.id}`}>Submit Grades</Link>
                </Button>
                <Button size="sm" variant="secondary" disabled>
                  Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
