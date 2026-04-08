'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Analytics = {
  semester: string
  totalRegisteredRowsThisSemester: number
  studentsWhoHaveNotRegistered: number
  mostPopularCourse: { code: string; title: string; enrolled: number } | null
}

export default function AdminRegistrationControlPage() {
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    semester: '',
    is_open: true,
    start_date: '',
    end_date: '',
    max_credits: '18',
  })
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  const load = async () => {
    const r = await fetch('/api/admin/registration')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    const s = d.settings as {
      semester: string | null
      is_open: number
      start_date: string | null
      end_date: string | null
      max_credits: number
    }
    setForm({
      semester: s.semester || '',
      is_open: Boolean(s.is_open),
      start_date: s.start_date || '',
      end_date: s.end_date || '',
      max_credits: String(s.max_credits ?? 18),
    })
    if (d.analytics) setAnalytics(d.analytics)
  }

  useEffect(() => {
    void load()
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const daysUntilClose = useMemo(() => {
    if (!form.end_date) return null
    const end = new Date(form.end_date + 'T23:59:59')
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }, [form.end_date])

  const save = async () => {
    try {
      const r = await fetch('/api/admin/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: form.semester,
          is_open: form.is_open,
          start_date: form.start_date,
          end_date: form.end_date,
          max_credits: Number(form.max_credits),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Saved')
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
    <div className="page-fade-in mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Registration control</h1>

      <Card className="shadow-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Registration window</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              className={
                form.is_open ? 'bg-emerald-600 px-4 py-1.5 text-base text-white hover:bg-emerald-600' : 'bg-red-600 px-4 py-1.5 text-base text-white hover:bg-red-600'
              }
            >
              {form.is_open ? 'OPEN' : 'CLOSED'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysUntilClose != null && form.is_open && (
            <p className="rounded-lg bg-[#1a5fb4]/10 px-4 py-3 text-sm font-medium text-[#1a5fb4]">
              Registration closes in <strong>{Math.max(0, daysUntilClose)}</strong> day{daysUntilClose === 1 ? '' : 's'}
            </p>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <Label className="text-base">Registration open</Label>
            <Switch checked={form.is_open} onCheckedChange={v => setForm(f => ({ ...f, is_open: v }))} />
          </div>
          <div className="space-y-1">
            <Label>Semester label</Label>
            <Input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Max credits per student</Label>
            <Input value={form.max_credits} onChange={e => setForm(f => ({ ...f, max_credits: e.target.value }))} />
          </div>
          <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => void save()}>
            Save settings
          </Button>
        </CardContent>
      </Card>

      {analytics && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Registration statistics ({analytics.semester})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground">Total registered (rows) this semester</p>
              <p className="text-2xl font-bold text-[#1a5fb4]">{analytics.totalRegisteredRowsThisSemester}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground">Students who haven&apos;t registered yet</p>
              <p className="text-2xl font-bold text-[#1a5fb4]">{analytics.studentsWhoHaveNotRegistered}</p>
            </div>
            <div className="rounded-lg border border-border p-3 sm:col-span-2">
              <p className="text-muted-foreground">Most popular course</p>
              <p className="text-lg font-semibold text-[#1a5fb4]">
                {analytics.mostPopularCourse
                  ? `${analytics.mostPopularCourse.code} ${analytics.mostPopularCourse.title} (${analytics.mostPopularCourse.enrolled} enrolled)`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
