'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function FacultyDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/faculty/overview')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setData(d)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  if (!data) return <p className="text-destructive">Unable to load faculty dashboard.</p>

  const sections = data.sections as {
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
  const stats = data.stats as { coursesThisSemester: number; totalStudents: number; pendingGradeSubmissions: number }
  const semester = data.semester as string
  const facultyName = (data.facultyName as string) || 'Faculty'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a5fb4]">
          {facultyName} — You have {stats.coursesThisSemester} active courses this semester ({semester})
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-[#1a5fb4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#1a5fb4]">
            <span>{stats.totalStudents}</span>
            <span aria-hidden>👥</span>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#15803d]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Courses This Semester</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#1a5fb4]">
            <span>{stats.coursesThisSemester}</span>
            <span aria-hidden>📚</span>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#e05a00]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Grade Submissions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#e05a00]">
            <span>{stats.pendingGradeSubmissions}</span>
            <span aria-hidden>⏳</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(s => (
          <Card key={s.id} className="border-l-4 border-l-[#1a5fb4]">
            <CardHeader>
              <CardTitle className="text-base">
                {s.code} — {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Enrolled: {s.enrolled_count} / {s.capacity}
              <p className="mt-1">
                Schedule: {s.days || '—'} {s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : ''}
              </p>
              <p>Room: {s.room || '—'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="border-[#1a5fb4] text-[#1a5fb4]">
                  <Link href={`/faculty/roster/${s.id}`}>View roster</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
                  <Link href={`/faculty/grades/${s.id}`}>Submit grades</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-[#1a5fb4] text-[#1a5fb4]">
            <Link href="/faculty/courses">View All Rosters</Link>
          </Button>
          <Button asChild className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
            <Link href="/faculty/grades">Grade Submission Status</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#1a5fb4] text-[#1a5fb4]">
            <Link href="/faculty/office-hours">My Office Hours</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
