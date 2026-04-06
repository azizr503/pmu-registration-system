'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getStudentSchedule } from '@/lib/api/student'
import { getStudentOverview } from '@/lib/api/student'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']
const START_H = 7
const END_H = 21

function parseDaySet(days: string | null): Set<string> {
  if (!days) return new Set()
  return new Set(days.split(/[,\/]/).map(d => d.trim()).filter(Boolean))
}

function blockStyle(start: string | null, end: string | null) {
  if (!start || !end) return { top: '0%', height: '4%' }
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = (sh - START_H) * 60 + sm
  const endMin = (eh - START_H) * 60 + em
  const total = (END_H - START_H) * 60
  const top = (startMin / total) * 100
  const h = ((endMin - startMin) / total) * 100
  return { top: `${top}%`, height: `${Math.max(h, 3)}%` }
}

export default function StudentSchedulePage() {
  const [semester, setSemester] = useState('Spring 2026')
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentSchedule>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const o = await getStudentOverview()
        setSemester(o.registration.semester)
        setData(await getStudentSchedule(o.registration.semester))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const reload = async (sem: string) => {
    setLoading(true)
    try {
      setData(await getStudentSchedule(sem))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  if (!data) return null

  const conflictSet = new Set<string>()
  for (const c of data.conflicts) {
    conflictSet.add(c.a)
    conflictSet.add(c.b)
  }

  const colors = ['#1a5fb4', '#0d9488', '#7c3aed', '#ea580c', '#15803d', '#be185d']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Semester</p>
          <p className="text-lg font-semibold text-[#1a5fb4]">{data.semester}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Total credits: <strong>{data.totalCredits}</strong> / max {data.maxCredits}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print / Export
        </Button>
      </div>

      {data.conflicts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:text-red-100">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Conflicts:{' '}
            {data.conflicts.map(c => `⚠ ${c.courseA} vs ${c.courseB}`).join(' · ')}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <div className="relative min-w-[900px]">
          <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b text-xs font-medium text-muted-foreground">
            <div className="p-2">Time</div>
            {DAYS.map(d => (
              <div key={d} className="border-l p-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[80px_repeat(5,1fr)]" style={{ minHeight: 560 }}>
            <div className="relative border-r text-[10px] text-muted-foreground">
              {Array.from({ length: END_H - START_H }).map((_, i) => {
                const h = START_H + i
                return (
                  <div key={h} className="absolute w-full text-right pr-1" style={{ top: `${(i / (END_H - START_H)) * 100}%` }}>
                    {h}:00
                  </div>
                )
              })}
            </div>
            {DAYS.map((day, di) => (
              <div key={day} className="relative border-l border-border/60 bg-muted/20">
                {data.sections.map((s, idx) => {
                  const ds = parseDaySet(s.days)
                  if (!ds.has(day)) return null
                  const conflict = conflictSet.has(s.id)
                  const st = blockStyle(s.start_time, s.end_time)
                  return (
                    <div
                      key={`${s.id}-${day}`}
                      title={`${s.course_title} — ${s.instructor_name || ''}`}
                      className="absolute left-1 right-1 overflow-hidden rounded px-1 py-0.5 text-[10px] text-white shadow-sm sm:text-xs"
                      style={{
                        ...st,
                        backgroundColor: conflict ? '#dc2626' : colors[idx % colors.length],
                        zIndex: 2,
                      }}
                    >
                      <span className="font-semibold">{s.course_code}</span>
                      <span className="block opacity-90">{s.room}</span>
                      {conflict && <span className="text-[10px]">⚠️</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
