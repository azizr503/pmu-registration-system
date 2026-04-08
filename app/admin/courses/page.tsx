'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'

type Course = {
  id: string
  code: string
  title: string
  credits: number
  department: string | null
  prerequisites: string | null
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [sections, setSections] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
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
    if (r.ok) {
      setCourses(d.courses as Course[])
      setSections(d.sections as Record<string, unknown>[])
    }
  }

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [])

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.department || '').toLowerCase().includes(q)
    )
  }, [courses, search])

  const prereqDisplay = (c: Course) => {
    if (!c.prerequisites) return '—'
    try {
      const arr = JSON.parse(c.prerequisites) as string[]
      return Array.isArray(arr) && arr.length ? arr.join(', ') : '—'
    } catch {
      return c.prerequisites
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setCourseForm({ code: '', title: '', credits: '3', department: '', prerequisites: '' })
    setModalOpen(true)
  }

  const openEdit = (c: Course) => {
    setEditingId(c.id)
    let prereq = ''
    try {
      const arr = JSON.parse(c.prerequisites || '[]') as string[]
      prereq = Array.isArray(arr) ? arr.join(', ') : ''
    } catch {
      prereq = ''
    }
    setCourseForm({
      code: c.code,
      title: c.title,
      credits: String(c.credits),
      department: c.department || '',
      prerequisites: prereq,
    })
    setModalOpen(true)
  }

  const saveCourse = async () => {
    try {
      const prereq = courseForm.prerequisites
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (editingId) {
        const r = await fetch(`/api/admin/courses/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: courseForm.code,
            title: courseForm.title,
            credits: Number(courseForm.credits),
            department: courseForm.department,
            prerequisites: prereq,
          }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        toast.success('Course updated')
      } else {
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
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const deleteCourse = async () => {
    if (!deleteId) return
    try {
      const r = await fetch(`/api/admin/courses/${deleteId}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Course deleted')
      setDeleteId(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Course catalog</h1>
        <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      <Input
        placeholder="Search code, title, department…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Courses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#1a5fb4]">
                <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
                  <TableHead className="text-white">Code</TableHead>
                  <TableHead className="text-white">Title</TableHead>
                  <TableHead className="text-white">Credits</TableHead>
                  <TableHead className="text-white">Department</TableHead>
                  <TableHead className="text-white">Prerequisites</TableHead>
                  <TableHead className="text-right text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((c, i) => (
                  <TableRow key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.credits}</TableCell>
                    <TableCell>{c.department || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{prereqDisplay(c)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="mr-2 border-[#1a5fb4] text-[#1a5fb4]" onClick={() => openEdit(c)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500 text-red-600" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sections (reference)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          {sections.map((s: Record<string, unknown>) => (
            <div key={String(s.id)} className="rounded border border-border px-3 py-2">
              {String(s.course_code)} — {String(s.semester)} — {String(s.days)} {String(s.start_time)}–{String(s.end_time)} —{' '}
              {String(s.faculty_name || 'TBD')}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit course' : 'Add course'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
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
              <Input value={courseForm.department} onChange={e => setCourseForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Prerequisites (comma-separated codes)</Label>
              <Input
                value={courseForm.prerequisites}
                onChange={e => setCourseForm(f => ({ ...f, prerequisites: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#1a5fb4] text-white hover:bg-[#154a96]" onClick={() => void saveCourse()}>
              {editingId ? 'Save' : 'Add course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the course and its sections, registrations, and grades tied to those sections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => void deleteCourse()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
