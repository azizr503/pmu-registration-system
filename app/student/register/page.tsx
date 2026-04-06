'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getStudentOverview,
  getStudentSections,
  getStudentCart,
  postStudentCart,
  deleteStudentCart,
  confirmRegistration,
} from '@/lib/api/student'
import { Loader2 } from 'lucide-react'

type Section = {
  id: string
  code: string
  title: string
  credits: number
  department: string | null
  instructor_name: string | null
  days: string | null
  start_time: string | null
  end_time: string | null
  room: string | null
  capacity: number
  enrolled_count: number
}

export default function StudentRegisterPage() {
  const [semester, setSemester] = useState('Spring 2026')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [cart, setCart] = useState<Awaited<ReturnType<typeof getStudentCart>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const o = await getStudentOverview()
      setSemester(o.registration.semester)
      const [secRes, cartRes] = await Promise.all([
        getStudentSections(o.registration.semester, q || undefined),
        getStudentCart(o.registration.semester),
      ])
      setSections(secRes.sections as Section[])
      setCart(cartRes)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const departments = useMemo(() => {
    const d = new Set<string>()
    sections.forEach(s => {
      if (s.department) d.add(s.department)
    })
    return Array.from(d).sort()
  }, [sections])

  const filtered = useMemo(() => {
    return sections.filter(s => {
      if (dept && (s.department || '') !== dept) return false
      return true
    })
  }, [sections, dept])

  const cartConflictFree = useMemo(() => {
    if (!cart?.items.length) return true
    return !cart.overLimit
  }, [cart])

  const handleAdd = async (sectionId: string) => {
    setAdding(sectionId)
    try {
      const res = (await postStudentCart(sectionId, semester)) as {
        ok?: boolean
        code?: string
        message?: string
      }
      if (res.ok) {
        toast.success('Added successfully')
      } else if (res.code === 'CONFLICT') {
        toast.error(res.message || 'Time conflict', { className: 'border-red-500' })
      } else if (res.code === 'PREREQ') {
        toast.warning(res.message || 'Prerequisite not met')
      } else {
        toast.error(res.message || 'Could not add')
      }
      const cartRes = await getStudentCart(semester)
      setCart(cartRes)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setAdding(null)
    }
  }

  const handleDrop = async (sectionId: string) => {
    try {
      await deleteStudentCart(sectionId, semester)
      toast.success('Removed from cart')
      setCart(await getStudentCart(semester))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleConfirm = async () => {
    try {
      await confirmRegistration(semester)
      toast.success('Registration confirmed')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not confirm')
    }
  }

  const suggestNoConflict = async () => {
    toast.message('Showing sections that fit your current cart — filter the table by availability.')
  }

  if (loading && !cart) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                <SelectItem value="Fall 2025">Fall 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load()
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search code, title, instructor…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <Select value={dept || 'all'} onValueChange={v => setDept(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              void (async () => {
                try {
                  const o = await getStudentOverview()
                  const secRes = await getStudentSections(o.registration.semester, q || undefined)
                  setSections(secRes.sections as Section[])
                } catch {
                  toast.error('Search failed')
                }
              })()
            }}
          >
            Search
          </Button>
          <Button variant="outline" className="border-[#e05a00] text-[#e05a00]" onClick={suggestNoConflict}>
            Courses without conflict
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => {
                    const seatsLeft = s.capacity - s.enrolled_count
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.code}</TableCell>
                        <TableCell>{s.title}</TableCell>
                        <TableCell>{s.credits}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{s.instructor_name || '—'}</TableCell>
                        <TableCell>{s.days || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : '—'}
                        </TableCell>
                        <TableCell>{s.room || '—'}</TableCell>
                        <TableCell>
                          {seatsLeft > 0 ? `${seatsLeft} left` : 'Full'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={seatsLeft <= 0 || adding === s.id}
                            className="bg-[#1a5fb4]"
                            onClick={() => void handleAdd(s.id)}
                          >
                            {adding === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader>
          <CardTitle>My Cart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!cart ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {cart.items.length === 0 && <li className="text-muted-foreground">No courses in cart.</li>}
                {(cart.items as { course_code: string; section_id: string; credits: number }[]).map(
                  (it: { course_code: string; section_id: string; credits: number }) => (
                    <li key={it.section_id} className="flex items-center justify-between gap-2 border-b border-border pb-2">
                      <span>
                        {it.course_code} <span className="text-muted-foreground">({it.credits} cr)</span>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => void handleDrop(it.section_id)}>
                        Drop
                      </Button>
                    </li>
                  )
                )}
              </ul>
              <p className="text-sm">
                Total credits: <strong>{cart.totalCredits}</strong> / max {cart.maxCredits}
              </p>
              {cart.overLimit && (
                <p className="text-sm text-amber-600">Warning: you are over the credit limit.</p>
              )}
              <Button
                className="w-full bg-[#1a5fb4]"
                disabled={!cartConflictFree || cart.items.length === 0}
                onClick={() => void handleConfirm()}
              >
                Confirm Registration
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
