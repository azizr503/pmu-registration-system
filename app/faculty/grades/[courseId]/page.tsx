'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [weights, setWeights] = useState({ mid: 0.4, fin: 0.4, asg: 0.2 })
  const [sectionMeta, setSectionMeta] = useState<{ code: string; title: string; semester: string } | null>(null)
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
      setSectionMeta(d.section)
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

  const calcGrade = (r: Row) => {
    if (r.midterm == null || r.final == null || r.assignment == null) return null
    const v = r.midterm * weights.mid + r.final * weights.fin + r.assignment * weights.asg
    return Math.round(v * 100) / 100
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
      <h1 className="text-xl font-semibold text-[#1a5fb4]">
        Grade Submission — {sectionMeta ? `${sectionMeta.code} ${sectionMeta.title} (${sectionMeta.semester})` : sectionId}
      </h1>
      <p className="rounded-md bg-[#1a5fb4]/10 px-3 py-2 text-sm text-[#1a5fb4]">
        Weights: Midterm {weights.mid * 100}% · Final {weights.fin * 100}% · Assignments {weights.asg * 100}%
      </p>
      {locked && <p className="text-sm font-medium text-emerald-700">Grades Submitted ✅</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-[#1a5fb4]">
            <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
              <TableHead className="text-white">Student ID</TableHead>
              <TableHead className="text-white">Student Name</TableHead>
              <TableHead className="text-white">Midterm (%)</TableHead>
              <TableHead className="text-white">Final (%)</TableHead>
              <TableHead className="text-white">Assignment (%)</TableHead>
              <TableHead className="text-white">Calculated Grade</TableHead>
              <TableHead className="text-white">Override</TableHead>
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
                    min={0}
                    max={100}
                    value={r.midterm ?? ''}
                    onChange={e => update(r.userId, 'midterm', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    disabled={r.isFinal}
                    min={0}
                    max={100}
                    value={r.final ?? ''}
                    onChange={e => update(r.userId, 'final', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-20"
                    disabled={r.isFinal}
                    min={0}
                    max={100}
                    value={r.assignment ?? ''}
                    onChange={e => update(r.userId, 'assignment', e.target.value)}
                  />
                </TableCell>
                <TableCell>{calcGrade(r) != null ? calcGrade(r)?.toFixed(1) : '—'}</TableCell>
                <TableCell>
                  <Select
                    value={r.overrideGrade || 'auto'}
                    disabled={r.isFinal}
                    onValueChange={v => update(r.userId, 'overrideGrade', v === 'auto' ? '' : v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].map(g => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="bg-[#1a5fb4] text-white hover:bg-[#154a96]" disabled={locked} onClick={() => void save('draft')}>
          Save Draft
        </Button>
        <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" disabled={locked} onClick={() => setConfirmOpen(true)}>
          Submit Final Grades
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit final grades?</DialogTitle>
            <DialogDescription>
              This action is final. Grades cannot be changed after submission.
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
