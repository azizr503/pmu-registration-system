'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function FacultyProfilePage() {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    faculty_id: '',
    department: '',
    office_location: '',
    office_hours: '',
    phone: '',
    photo_url: '',
    courses_taught_history: '',
  })

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/faculty/profile')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        const p = d.profile as Record<string, string>
        setForm({
          full_name: p.full_name || '',
          faculty_id: p.faculty_id || '',
          department: p.department || '',
          office_location: p.office_location || '',
          office_hours: p.office_hours || '',
          phone: p.phone || '',
          photo_url: p.photo_url || '',
          courses_taught_history: p.courses_taught_history || '[]',
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Load failed')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/faculty/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      if (d.user) await refreshUser()
      toast.success('Saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
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
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Faculty Profile</h1>
      <div className="space-y-4 rounded-xl border border-border bg-white p-6">
        <div className="space-y-2">
          <Label>Photo URL</Label>
          <Input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Faculty ID</Label>
            <Input value={form.faculty_id} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Office Location</Label>
          <Input
            value={form.office_location}
            onChange={e => setForm(f => ({ ...f, office_location: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Office Hours</Label>
          <Input value={form.office_hours} onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Courses taught (JSON history)</Label>
          <Input
            value={form.courses_taught_history}
            onChange={e => setForm(f => ({ ...f, courses_taught_history: e.target.value }))}
          />
        </div>
        <Button className="bg-[#1a5fb4]" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}
