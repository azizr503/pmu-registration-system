'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

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
  const initials = form.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x[0]?.toUpperCase() || '')
    .join('') || 'AH'
  const teachingHistory = (() => {
    try {
      const v = JSON.parse(form.courses_taught_history || '[]') as string[]
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  })()

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
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Faculty Profile</h1>
        <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-white p-6">
        <div className="flex justify-center">
          <div className="relative">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Faculty avatar" className="h-24 w-24 rounded-full border border-[#1a5fb4] object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1a5fb4] text-2xl font-semibold text-white">
                {initials}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-[#e05a00] p-2 text-white">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setForm(prev => ({ ...prev, photo_url: URL.createObjectURL(f) }))
                }}
              />
            </label>
          </div>
        </div>
        <p className="text-sm font-semibold text-[#1a5fb4]">Professional Info</p>
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Faculty ID</Label>
            <Input value={form.faculty_id} disabled className="bg-muted text-muted-foreground" />
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
          <Label>Teaching History</Label>
          <div className="flex flex-wrap gap-2">
            {teachingHistory.length === 0 ? (
              <span className="text-sm text-muted-foreground">No history</span>
            ) : (
              teachingHistory.map(code => (
                <span key={code} className="rounded-full bg-[#1a5fb4]/10 px-2.5 py-1 text-xs font-medium text-[#1a5fb4]">
                  {code}
                </span>
              ))
            )}
          </div>
        </div>
        <p className="text-sm font-semibold text-[#1a5fb4]">Contact Info</p>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}
