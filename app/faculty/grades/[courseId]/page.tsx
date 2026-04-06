'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Row = {
  studentId: string
  name: string
  userId: string
  midterm: number | null
  final: number | null
  assignment: number | null
  calculatedGrade: number | null
  letterGrade: string | null
  overrideGrade: string | null
  isFinal: boolean
}

export default function FacultyGradesPage() {
  const params = useParams()
  const sectionId = params.courseId as string
  const [rows, setRows] = useState<Row[]>([])
  const [weights, setWeights] = useState({ mid: 0.3, fin: 0.5, asg: 0.2 })
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/faculty/grades/${sectionId}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRows(d.rows)
      setWeights(d.weights)
      setLocked(d.locked)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [sectionId])

  const update = (userId: string, field: keyof Row, value: string) => {
    const num = value === '' ? null : Number(value)
    setRows(prev =>
      prev.map(r =>
        r.userId === userId
          ? {
              ...r,
              [field]: field === 'overrideGrade' ? value || null : num,
            }
          : r
      )
    )
  }

  const save = async (action: 'draft' | 'final') => {
    try {
      const r = await fetch(`/api/faculty/grades/${sectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          grades: rows.map(r => ({
            userId: r.userId,
            midterm: r.midterm,
            final: r.final,
            assignment: r.assignment,
            overrideGrade: r.overrideGrade,
          })),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(action === 'final' ? 'Grades submitted' : 'Draft saved')
      setLocked(Boolean(d.locked))
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Grade submission</h1>
      <p className="text-sm text-muted-foreground">
        Weights: Midterm {weights.mid * 100}% · Final {weights.fin * 100}% · Assignments {weights.asg * 100}%
      </p>
      {locked && <p className="text-sm text-amber-600">Grades are locked for this section.</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Midterm</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Calculated</TableHead>
              <TableHead>Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.userId}>
                <TableCell className="font-mono">{r.studentId}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    disabled={r.isFinal}
                    value={r.midterm ?? ''}
                    onChange={e => update(r.userId, 'midterm', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    disabled={r.isFinal}
                    value={r.final ?? ''}
                    onChange={e => update(r.userId, 'final', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    disabled={r.isFinal}
                    value={r.assignment ?? ''}
                    onChange={e => update(r.userId, 'assignment', e.target.value)}
                  />
                </TableCell>
                <TableCell>{r.calculatedGrade != null ? r.calculatedGrade.toFixed(1) : '—'}</TableCell>
                <TableCell>
                  <Input
                    className="w-16"
                    disabled={r.isFinal}
                    value={r.overrideGrade ?? ''}
                    onChange={e => update(r.userId, 'overrideGrade', e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={locked} onClick={() => void save('draft')}>
          Save Draft
        </Button>
        <Button className="bg-[#1a5fb4]" disabled={locked} onClick={() => setConfirmOpen(true)}>
          Submit Final Grades
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit final grades?</DialogTitle>
            <DialogDescription>
              This locks the grade sheet for students in this section. In production, changes would require registrar
              approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#e05a00]"
              onClick={() => {
                setConfirmOpen(false)
                void save('final')
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
