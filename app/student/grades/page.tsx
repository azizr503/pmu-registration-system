'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getStudentGrades } from '@/lib/api/student'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function StudentGradesPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getStudentGrades()
      .then(setData)
      .catch(e => toast.error(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  const rows = data.rows as {
    code: string
    title: string
    credits: number
    letter_grade: string | null
    override_grade: string | null
    semester: string
  }[]

  const semesters = (data.semesters as string[]) || []
  const cumulativeGpa = data.cumulativeGpa as number
  const creditsCompleted = data.creditsCompleted as number
  const creditsRequired = data.creditsRequired as number

  const letter = (r: { letter_grade: string | null; override_grade: string | null }) =>
    r.override_grade || r.letter_grade || '—'

  const gradePoints = (grade: string) => {
    const g = grade.toUpperCase()
    const map: Record<string, number> = {
      'A+': 4.0,
      A: 4.0,
      'A-': 3.7,
      'B+': 3.3,
      B: 3.0,
      'B-': 2.7,
      'C+': 2.3,
      C: 2.0,
      'C-': 1.7,
      D: 1.0,
      F: 0,
    }
    return map[g] ?? 0
  }

  const gradeBadgeClass = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-700'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700'
    if (grade.startsWith('C')) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a5fb4]">Grades and Transcript</h1>
          <p className="text-sm text-muted-foreground">
            Cumulative GPA: <strong>{cumulativeGpa.toFixed(2)}</strong>
          </p>
        </div>
        <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => setOpen(true)}>
          Request Official Transcript
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-sm font-medium">Degree progress</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Credits completed: <strong>{creditsCompleted}</strong> / {creditsRequired} required
        </p>
        <div className="mt-2 h-4 w-full max-w-md rounded-full bg-muted">
          <div
            className="flex h-4 items-center justify-end rounded-full bg-[#1a5fb4] pr-2 text-[10px] font-medium text-white"
            style={{ width: `${Math.min(100, (creditsCompleted / creditsRequired) * 100)}%` }}
          >
            {Math.min(100, Math.round((creditsCompleted / creditsRequired) * 100))}%
          </div>
        </div>
      </div>

      <Tabs defaultValue={semesters[0] || 'all'}>
        <TabsList className="flex flex-wrap">
          {semesters.length === 0 ? (
            <TabsTrigger value="all">All</TabsTrigger>
          ) : (
            semesters.map(s => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))
          )}
        </TabsList>
        {semesters.length === 0 ? (
          <TabsContent value="all">
            <p className="text-sm text-muted-foreground">No graded courses yet.</p>
          </TabsContent>
        ) : (
        semesters.map(sem => (
          <TabsContent key={sem} value={sem}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Grade Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows
                  .filter(r => r.semester === sem)
                  .map((r, i) => (
                    <TableRow key={`${r.code}-${i}`}>
                      <TableCell className="font-mono">{r.code}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.credits}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(letter(r))}`}>
                          {letter(r)}
                        </span>
                      </TableCell>
                      <TableCell>{gradePoints(letter(r)).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-sm text-muted-foreground">
              Semester GPA:{' '}
              <strong className="text-[#1a5fb4]">
                {(() => {
                  const semRows = rows.filter(r => r.semester === sem)
                  const totalCredits = semRows.reduce((sum, r) => sum + r.credits, 0)
                  if (totalCredits === 0) return '0.00'
                  const weighted = semRows.reduce((sum, r) => sum + gradePoints(letter(r)) * r.credits, 0)
                  return (weighted / totalCredits).toFixed(2)
                })()}
              </strong>
            </p>
          </TabsContent>
        )))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Official transcript request</DialogTitle>
            <DialogDescription>
              Your request has been noted for demonstration purposes. In production, this would route to the
              Registrar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
