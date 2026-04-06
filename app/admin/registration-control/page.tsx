'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function AdminRegistrationControlPage() {
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    semester: '',
    is_open: true,
    start_date: '',
    end_date: '',
    max_credits: '18',
  })

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
  }

  useEffect(() => {
    void load()
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

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
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Registration control</h1>
      <Card>
        <CardHeader>
          <CardTitle>Current period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Registration open</Label>
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
          <Button className="bg-[#1a5fb4]" onClick={() => void save()}>
            Save settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
