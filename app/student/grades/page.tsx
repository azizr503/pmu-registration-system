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
import { gradeColorClass } from '@/lib/grade-utils'
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a5fb4]">Grades and Transcript</h1>
          <p className="text-sm text-muted-foreground">
            Cumulative GPA: <strong>{cumulativeGpa.toFixed(2)}</strong>
          </p>
        </div>
        <Button className="bg-[#1a5fb4]" onClick={() => setOpen(true)}>
          Request Official Transcript
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-sm font-medium">Degree progress</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Credits completed: <strong>{creditsCompleted}</strong> / {creditsRequired} required
        </p>
        <div className="mt-2 h-2 w-full max-w-md rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-[#1a5fb4]"
            style={{ width: `${Math.min(100, (creditsCompleted / creditsRequired) * 100)}%` }}
          />
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
                  <TableHead>Points</TableHead>
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
                      <TableCell className={gradeColorClass(letter(r))}>{letter(r)}</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
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
