'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiUrl } from '@/lib/api-base'

export default function FacultyRosterPage() {
  const params = useParams()
  const sectionId = params.courseId as string
  const [q, setQ] = useState('')
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [sectionMeta, setSectionMeta] = useState<{ code: string; title: string; semester: string } | null>(null)
  const [rows, setRows] = useState<
    {
      studentId: string
      name: string
      email: string
      attendancePct: number
      currentGrade: string
      registeredDate: string
    }[]
  >([])
  const [loading, setLoading] = useState(true)

  const load = async (search?: string) => {
    setLoading(true)
    try {
      const u = new URL(apiUrl(`/faculty/roster/${sectionId}`))
      if (search) u.searchParams.set('q', search)
      const r = await fetch(u.toString(), { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setSectionMeta(d.section)
      const dateByStudent: Record<string, string> = {
        '202012345': '2026-01-15',
        '202012346': '2026-01-16',
        '202012347': '2026-01-17',
      }
      setRows(
        d.students.map((s: { studentId: string; name: string; email: string; attendancePct: number; currentGrade: string }) => ({
          ...s,
          registeredDate: dateByStudent[s.studentId] || '2026-01-18',
        }))
      )
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
    const header = ['Student ID', 'Name', 'Email', 'Registered Date', 'Current Grade', 'Attendance %']
    const lines = [
      header.join(','),
      ...rows.map(r => [r.studentId, r.name, r.email, r.registeredDate, r.currentGrade, r.attendancePct].join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `roster-${sectionId}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a5fb4]">
            {sectionMeta ? `${sectionMeta.code} ${sectionMeta.title}` : 'Class Roster'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Section {sectionId} {sectionMeta ? `• ${sectionMeta.semester}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search by name or ID…" value={q} onChange={e => setQ(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={() => void load(q)}>
            Filter
          </Button>
          <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button className="bg-[#1a5fb4] text-white hover:bg-[#154a96]" onClick={() => setAnnounceOpen(true)}>
            Send Announcement
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <Table>
          <TableHeader className="bg-[#1a5fb4]">
            <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
              <TableHead className="text-white">Student ID</TableHead>
              <TableHead className="text-white">Student Name</TableHead>
              <TableHead className="text-white">Email</TableHead>
              <TableHead className="text-white">Registered Date</TableHead>
              <TableHead className="text-white">Current Grade</TableHead>
              <TableHead className="text-white">Attendance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.studentId}>
                <TableCell className="font-mono">{r.studentId}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.registeredDate}</TableCell>
                <TableCell>{r.currentGrade}</TableCell>
                <TableCell>{r.attendancePct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={announceOpen} onOpenChange={setAnnounceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
          </DialogHeader>
          <Textarea
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            placeholder="Type announcement message for enrolled students..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnounceOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#e05a00] text-white hover:bg-[#c94f00]"
              onClick={() => {
                setAnnounceOpen(false)
                setAnnouncement('')
                toast.success('Announcement sent (demo)')
              }}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
