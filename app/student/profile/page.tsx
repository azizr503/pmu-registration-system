'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { putStudentProfile } from '@/lib/api/student'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

export default function StudentProfilePage() {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    email: '',
    major: '',
    minor: '',
    level: '',
    phone: '',
    emergency_contact: '',
    photo_url: '',
  })
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const initials = form.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() || '')
    .join('') || 'AA'

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/student/profile')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        const p = d.profile as Record<string, string | number>
        setForm({
          full_name: String(p.full_name || ''),
          student_id: String(p.student_id || ''),
          email: String(p.email || ''),
          major: String(p.major || ''),
          minor: String(p.minor || ''),
          level: String(p.level || ''),
          phone: String(p.phone || ''),
          emergency_contact: String(p.emergency_contact || ''),
          photo_url: String(p.photo_url || ''),
        })
        setStatus((d.profile.accountStatus as 'active' | 'inactive') || 'active')
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
      const res = await putStudentProfile({ ...form })
      if (res.user) await refreshUser()
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">My Profile</h1>
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Profile" className="h-24 w-24 rounded-full border-2 border-[#1a5fb4] object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1a5fb4] text-2xl font-semibold text-white">
                {initials}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-[#e05a00] p-2 text-white shadow-md hover:bg-[#c94f00]">
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
          <p className="text-xs text-muted-foreground">Upload profile photo</p>
        </div>
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <p className="text-sm font-semibold text-[#1a5fb4]">Academic Info</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input value={form.student_id} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} disabled className="bg-muted text-muted-foreground" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Major</Label>
            <Input value={form.major} onChange={e => setForm(f => ({ ...f, major: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Minor</Label>
            <Input value={form.minor} onChange={e => setForm(f => ({ ...f, minor: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Academic Level</Label>
          <Input value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Advisor (read-only in demo)</Label>
          <Input disabled className="bg-muted" placeholder="Assigned advisor" />
        </div>
        <p className="text-sm font-semibold text-[#1a5fb4]">Contact Info</p>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Emergency Contact</Label>
          <Input
            value={form.emergency_contact}
            onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
          />
        </div>
        <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
