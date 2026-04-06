'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function FacultyRosterPage() {
  const params = useParams()
  const sectionId = params.courseId as string
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<
    { studentId: string; name: string; email: string; attendancePct: number; currentGrade: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  const load = async (search?: string) => {
    setLoading(true)
    try {
      const u = new URL(`/api/faculty/roster/${sectionId}`, window.location.origin)
      if (search) u.searchParams.set('q', search)
      const r = await fetch(u.toString())
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRows(d.students)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [sectionId])

  const exportCsv = () => {
    const header = ['Student ID', 'Name', 'Email', 'Attendance %', 'Grade']
    const lines = [header.join(','), ...rows.map(r => [r.studentId, r.name, r.email, r.attendancePct, r.currentGrade].join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `roster-${sectionId}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Class Roster</h1>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="w-48" />
          <Button variant="outline" onClick={() => void load(q)}>
            Filter
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button
            className="bg-[#e05a00]"
            onClick={() => toast.success('Announcement queued (demo)')}
          >
            Send Announcement
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Attendance %</TableHead>
              <TableHead>Current Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.studentId}>
                <TableCell className="font-mono">{r.studentId}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.attendancePct}</TableCell>
                <TableCell>{r.currentGrade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
