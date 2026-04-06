'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function AdminCoursesPage() {
  const [data, setData] = useState<{ courses: Record<string, unknown>[]; sections: Record<string, unknown>[] } | null>(
    null
  )
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    credits: '3',
    department: '',
    prerequisites: '',
  })

  const load = async () => {
    const r = await fetch('/api/admin/courses')
    const d = await r.json()
    if (r.ok) setData(d)
  }

  useEffect(() => {
    void load()
  }, [])

  const addCourse = async () => {
    try {
      const prereq = courseForm.prerequisites
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const r = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'course',
          code: courseForm.code,
          title: courseForm.title,
          credits: Number(courseForm.credits),
          department: courseForm.department,
          prerequisites: prereq,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Course added')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Course catalog</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add course</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={courseForm.code} onChange={e => setCourseForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Credits</Label>
            <Input value={courseForm.credits} onChange={e => setCourseForm(f => ({ ...f, credits: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Input
              value={courseForm.department}
              onChange={e => setCourseForm(f => ({ ...f, department: e.target.value }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Prerequisites (comma-separated codes)</Label>
            <Input
              value={courseForm.prerequisites}
              onChange={e => setCourseForm(f => ({ ...f, prerequisites: e.target.value }))}
            />
          </div>
          <Button className="bg-[#1a5fb4] sm:col-span-2" onClick={() => void addCourse()}>
            Add course
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {data.courses.map(c => (
            <div key={String(c.id)} className="rounded border border-border px-3 py-2">
              <strong>{String(c.code)}</strong> — {String(c.title)} ({String(c.credits)} cr)
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {data.sections.map((s: Record<string, unknown>) => (
            <div key={String(s.id)} className="rounded border border-border px-3 py-2">
              {String(s.course_code)} — {String(s.semester)} — {String(s.days)} {String(s.start_time)}–
              {String(s.end_time)} — {String(s.faculty_name || 'TBD')}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
