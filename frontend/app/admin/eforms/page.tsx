'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiUrl } from '@/lib/api-base'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type AdminEform = {
  id: string
  form_type: string
  status: 'pending' | 'approved' | 'rejected'
  form_data: Record<string, unknown>
  student_note: string
  admin_note: string
  submitted_at: string
  student: {
    id: string
    student_id: string | null
    name: string
    major: string
    email: string
  }
}

function formLabel(type: string) {
  const map: Record<string, string> = {
    course_withdrawal: 'Course Withdrawal Request',
    graduation_clearance: 'Graduation Clearance',
    change_of_major: 'Change of Major',
    internship_request: 'Internship Request',
    leave_of_absence: 'Leave of Absence',
    tuition_refund: 'Tuition Refund',
    change_of_degree_plan: 'Change of Degree Plan',
    attestation_letter: 'Attestation Letter',
  }
  return map[type] || type
}

function statusBadge(status: AdminEform['status']) {
  if (status === 'approved') return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Approved</Badge>
  if (status === 'rejected') return <Badge className="bg-red-600 text-white hover:bg-red-600">Rejected</Badge>
  return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Pending</Badge>
}

export default function AdminEformsPage() {
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [rows, setRows] = useState<AdminEform[]>([])
  const [open, setOpen] = useState(false)
  const [reviewing, setReviewing] = useState<AdminEform | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const r = await fetch(apiUrl('/admin/eforms'), { credentials: 'include' })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Failed to load eForms')
    setRows(d.requests || [])
  }

  useEffect(() => {
    void load().catch(() => toast.error('Failed to load eForms'))
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'all') return rows
    return rows.filter(r => r.status === tab)
  }, [rows, tab])

  const startReview = (r: AdminEform) => {
    setReviewing(r)
    setAdminNote(r.admin_note || '')
    setOpen(true)
  }

  const doAction = async (action: 'approved' | 'rejected') => {
    if (!reviewing) return
    setSaving(true)
    try {
      const r = await fetch(apiUrl(`/admin/eforms/${reviewing.id}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_note: adminNote }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to update request')
      toast.success(`Request ${action}`)
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1a5fb4]">eForms Requests</h1>
      </div>
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-[#1a5fb4]">
            <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
              <TableHead className="text-white">Student Name</TableHead>
              <TableHead className="text-white">Form Type</TableHead>
              <TableHead className="text-white">Submitted Date</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.student.name}</TableCell>
                <TableCell>{formLabel(r.form_type)}</TableCell>
                <TableCell>{new Date(r.submitted_at).toLocaleString()}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => startReview(r)}>Review</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No requests found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>

          {reviewing && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border p-3">
                <p><span className="font-medium">Student:</span> {reviewing.student.name}</p>
                <p><span className="font-medium">Student ID:</span> {reviewing.student.student_id || '—'}</p>
                <p><span className="font-medium">Major:</span> {reviewing.student.major || '—'}</p>
                <p><span className="font-medium">Form:</span> {formLabel(reviewing.form_type)}</p>
                <p><span className="font-medium">Submitted:</span> {new Date(reviewing.submitted_at).toLocaleString()}</p>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">Submitted Form Data</p>
                <div className="space-y-1">
                  {Object.entries(reviewing.form_data || {}).map(([k, v]) => (
                    <p key={k}>
                      <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {String(v)}
                    </p>
                  ))}
                </div>
                {reviewing.student_note ? <p className="mt-2"><span className="font-medium">Student note:</span> {reviewing.student_note}</p> : null}
              </div>

              <div className="space-y-1">
                <p className="font-medium">Admin Note</p>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} className="bg-red-600 text-white hover:bg-red-700" onClick={() => void doAction('rejected')}>Reject</Button>
            <Button disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void doAction('approved')}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
