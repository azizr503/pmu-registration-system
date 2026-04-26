'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { apiUrl } from '@/lib/api-base'

type CourseRow = {
  id: string
  code: string
  title: string
  enrolled_count: number
  capacity: number
  grades_submitted: number
}

export default function FacultyGradesStatusPage() {
  const [semester, setSemester] = useState('Spring 2026')
  const [rows, setRows] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl('/faculty/courses'), { credentials: 'include' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setSemester(d.semester)
        setRows(d.courses)
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Grade Submission Status — {semester}</h1>
      <Table>
        <TableHeader className="bg-[#1a5fb4]">
          <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
            <TableHead className="text-white">Course</TableHead>
            <TableHead className="text-white">Section</TableHead>
            <TableHead className="text-white">Students</TableHead>
            <TableHead className="text-white">Grades Submitted</TableHead>
            <TableHead className="text-white">Status</TableHead>
            <TableHead className="text-white">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => {
            const status = r.grades_submitted ? 'Submitted' : r.enrolled_count > 0 ? 'Draft Saved' : 'Not Started'
            return (
              <TableRow key={r.id}>
                <TableCell>{r.code} — {r.title}</TableCell>
                <TableCell>Section {String(idx + 1).padStart(2, '0')}</TableCell>
                <TableCell>{r.enrolled_count}</TableCell>
                <TableCell>{r.grades_submitted ? `${r.enrolled_count}/${r.enrolled_count}` : `0/${r.enrolled_count}`}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === 'Submitted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : status === 'Draft Saved'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" className="bg-[#e05a00] text-white hover:bg-[#c94f00]">
                    <Link href={`/faculty/grades/${r.id}`}>Submit Grades</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
