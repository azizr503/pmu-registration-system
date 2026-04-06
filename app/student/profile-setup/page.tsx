'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { putStudentProfile } from '@/lib/api/student'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function StudentProfileSetupPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    major: '',
    minor: '',
    level: '',
    phone: '',
    emergency_contact: '',
  })

  const submit = async () => {
    setSaving(true)
    try {
      await putStudentProfile({ ...form, markComplete: true })
      await refreshUser()
      toast.success('Profile saved')
      router.push('/student/dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Complete your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This is required before using the full student portal.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-white p-6">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
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
        <Button className="w-full bg-[#1a5fb4]" onClick={() => void submit()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Continue'}
        </Button>
      </div>
    </div>
  )
}
