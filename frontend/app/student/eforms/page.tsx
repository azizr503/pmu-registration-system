'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiUrl } from '@/lib/api-base'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type FormType =
  | 'course_withdrawal'
  | 'graduation_clearance'
  | 'change_of_major'
  | 'internship_request'
  | 'leave_of_absence'
  | 'tuition_refund'
  | 'change_of_degree_plan'
  | 'attestation_letter'

type EformRequest = {
  id: string
  form_type: FormType
  status: 'pending' | 'approved' | 'rejected'
  form_data: Record<string, unknown>
  student_note: string
  admin_note: string
  submitted_at: string
}

type StudentProfile = {
  student_id: string
  full_name: string
  major: string
  level: string
  gpa: number
  credits_completed: number
}

const FORM_DEFS: { type: FormType; title: string; desc: string }[] = [
  { type: 'course_withdrawal', title: 'Course Withdrawal Request', desc: 'Request withdrawal from a currently enrolled course.' },
  { type: 'graduation_clearance', title: 'Graduation Clearance', desc: 'Apply for graduation and clearance review.' },
  { type: 'change_of_major', title: 'Change of Major', desc: 'Submit request to move to a different major.' },
  { type: 'internship_request', title: 'Internship Request', desc: 'Register an internship placement for approval.' },
  { type: 'leave_of_absence', title: 'Leave of Absence', desc: 'Apply for a temporary leave from studies.' },
  { type: 'tuition_refund', title: 'Tuition Refund', desc: 'Request refund review for eligible payments.' },
  { type: 'change_of_degree_plan', title: 'Change of Degree Plan', desc: 'Update your approved degree plan track.' },
  { type: 'attestation_letter', title: 'Attestation Letter', desc: 'Request an official attestation letter.' },
]

const majors = ['Computer Science', 'Computer Engineering', 'Software Engineering', 'Information Technology', 'Artificial Intelligence', 'Cybersecurity']

function statusBadge(status: EformRequest['status']) {
  if (status === 'approved') return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Approved</Badge>
  if (status === 'rejected') return <Badge className="bg-red-600 text-white hover:bg-red-600">Rejected</Badge>
  return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Pending</Badge>
}

export default function StudentEformsPage() {
  const [open, setOpen] = useState(false)
  const [activeType, setActiveType] = useState<FormType>('course_withdrawal')
  const [requests, setRequests] = useState<EformRequest[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [studentGpa, setStudentGpa] = useState(0)
  const [courses, setCourses] = useState<{ code: string; title: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [studentNote, setStudentNote] = useState('')

  const activeMeta = FORM_DEFS.find(f => f.type === activeType)!

  const load = async () => {
    const r = await fetch(apiUrl('/student/eforms'), { credentials: 'include' })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Failed to load eForms')
    setRequests(d.requests || [])
    setProfile(d.profile || null)
    setStudentGpa(Number(d.profile?.gpa ?? 0))
    setCourses(d.registeredCourses || [])
  }

  useEffect(() => {
    void load().catch(() => toast.error('Failed to load eForms'))
  }, [])

  const begin = (type: FormType) => {
    setActiveType(type)
    setStudentNote('')
    const initial: Record<string, unknown> = {}
    if (type === 'graduation_clearance' && profile) initial.total_credits_completed = profile.credits_completed
    if (type === 'change_of_major' && profile) {
      initial.current_major = profile.major || ''
      initial.current_gpa = studentGpa
    }
    if (type === 'change_of_degree_plan' && profile) initial.current_plan = `${profile.major || 'Current'} Plan`
    setFormData(initial)
    setOpen(true)
  }

  const isValid = useMemo(() => {
    const txt = (k: string) => String(formData[k] ?? '').trim()
    const num = (k: string) => Number(formData[k] ?? NaN)
    if (activeType === 'course_withdrawal') return !!txt('course_code') && !!txt('reason') && txt('explanation').length >= 20 && !!txt('preferred_withdrawal_date')
    if (activeType === 'graduation_clearance') return !!txt('expected_graduation_semester') && Number.isFinite(num('total_credits_completed')) && Boolean(formData.confirm_requirements)
    if (activeType === 'change_of_major') return !!txt('current_major') && !!txt('requested_major') && txt('reason').length >= 20 && Number.isFinite(num('current_gpa'))
    if (activeType === 'internship_request') return !!txt('company_name') && !!txt('company_address') && !!txt('supervisor_name') && !!txt('supervisor_email') && !!txt('start_date') && !!txt('end_date') && !!txt('internship_type') && txt('description').length >= 30
    if (activeType === 'leave_of_absence') return !!txt('leave_type') && !!txt('start_semester') && !!txt('duration') && txt('reason').length >= 30 && !!txt('supporting_document_note')
    if (activeType === 'tuition_refund') return !!txt('semester') && !!txt('reason') && Number.isFinite(num('amount_requested')) && num('amount_requested') > 0 && !!txt('bank_account_note') && !!txt('explanation')
    if (activeType === 'change_of_degree_plan') return !!txt('current_plan') && !!txt('requested_plan') && txt('reason').length >= 20
    return !!txt('purpose') && !!txt('recipient_name') && !!txt('language') && num('copies_needed') >= 1 && num('copies_needed') <= 5
  }, [activeType, formData])

  const setField = (key: string, value: unknown) => setFormData(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    if (!isValid) return
    setSubmitting(true)
    try {
      const r = await fetch(apiUrl('/student/eforms'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_type: activeType, form_data: formData, student_note: studentNote }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to submit')
      toast.success('Request submitted successfully')
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eForms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {FORM_DEFS.map(f => (
            <div key={f.type} className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="font-semibold text-[#1a5fb4]">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              <Button className="mt-3 bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => begin(f.type)}>
                Submit
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {requests.length === 0 && <p className="text-muted-foreground">No requests submitted yet.</p>}
          {requests.map(r => (
            <div key={r.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{FORM_DEFS.find(f => f.type === r.form_type)?.title || r.form_type}</p>
                {statusBadge(r.status)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Submitted: {new Date(r.submitted_at).toLocaleString()}</p>
              {r.admin_note ? <p className="mt-2 text-sm"><span className="font-medium">Admin note:</span> {r.admin_note}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeMeta.title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {activeType === 'course_withdrawal' && (
              <>
                <div className="space-y-1">
                  <Label>Course Code</Label>
                  <Select value={String(formData.course_code ?? '')} onValueChange={v => setField('course_code', v)}>
                    <SelectTrigger><SelectValue placeholder="Select registered course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Select value={String(formData.reason ?? '')} onValueChange={v => setField('reason', v)}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>{['Medical', 'Personal', 'Academic Difficulty', 'Schedule Conflict', 'Other'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Explanation</Label><Textarea value={String(formData.explanation ?? '')} onChange={e => setField('explanation', e.target.value)} /></div>
                <div className="space-y-1"><Label>Preferred Withdrawal Date</Label><Input type="date" value={String(formData.preferred_withdrawal_date ?? '')} onChange={e => setField('preferred_withdrawal_date', e.target.value)} /></div>
              </>
            )}

            {activeType === 'graduation_clearance' && (
              <>
                <div className="space-y-1"><Label>Expected Graduation Semester</Label><Select value={String(formData.expected_graduation_semester ?? '')} onValueChange={v => setField('expected_graduation_semester', v)}><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent>{['Spring 2026', 'Fall 2026', 'Spring 2027'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Total Credits Completed</Label><Input type="number" value={String(formData.total_credits_completed ?? profile?.credits_completed ?? 0)} onChange={e => setField('total_credits_completed', Number(e.target.value))} /></div>
                <div className="flex items-center gap-2"><Checkbox checked={Boolean(formData.confirm_requirements)} onCheckedChange={v => setField('confirm_requirements', Boolean(v))} /><Label>I confirm I have completed all degree requirements</Label></div>
              </>
            )}

            {activeType === 'change_of_major' && (
              <>
                <div className="space-y-1"><Label>Current Major</Label><Input value={String(formData.current_major ?? profile?.major ?? '')} onChange={e => setField('current_major', e.target.value)} /></div>
                <div className="space-y-1"><Label>Requested Major</Label><Select value={String(formData.requested_major ?? '')} onValueChange={v => setField('requested_major', v)}><SelectTrigger><SelectValue placeholder="Select major" /></SelectTrigger><SelectContent>{majors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Reason</Label><Textarea value={String(formData.reason ?? '')} onChange={e => setField('reason', e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>Current GPA</Label>
                  <Input
                    type="text"
                    value={(Number(formData.current_gpa ?? studentGpa) || 0).toFixed(2)}
                    disabled={true}
                    className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  />
                </div>
              </>
            )}

            {activeType === 'internship_request' && (
              <>
                <div className="space-y-1"><Label>Company Name</Label><Input value={String(formData.company_name ?? '')} onChange={e => setField('company_name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Company Address</Label><Input value={String(formData.company_address ?? '')} onChange={e => setField('company_address', e.target.value)} /></div>
                <div className="space-y-1"><Label>Supervisor Name</Label><Input value={String(formData.supervisor_name ?? '')} onChange={e => setField('supervisor_name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Supervisor Email</Label><Input type="email" value={String(formData.supervisor_email ?? '')} onChange={e => setField('supervisor_email', e.target.value)} /></div>
                <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={String(formData.start_date ?? '')} onChange={e => setField('start_date', e.target.value)} /></div>
                <div className="space-y-1"><Label>End Date</Label><Input type="date" value={String(formData.end_date ?? '')} onChange={e => setField('end_date', e.target.value)} /></div>
                <div className="space-y-1"><Label>Internship Type</Label><Select value={String(formData.internship_type ?? '')} onValueChange={v => setField('internship_type', v)}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{['Full-time', 'Part-time'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Description</Label><Textarea value={String(formData.description ?? '')} onChange={e => setField('description', e.target.value)} /></div>
              </>
            )}

            {activeType === 'leave_of_absence' && (
              <>
                <div className="space-y-1"><Label>Leave Type</Label><Select value={String(formData.leave_type ?? '')} onValueChange={v => setField('leave_type', v)}><SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger><SelectContent>{['Medical', 'Personal', 'Financial', 'Family Emergency'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Start Semester</Label><Select value={String(formData.start_semester ?? '')} onValueChange={v => setField('start_semester', v)}><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent>{['Spring 2026', 'Fall 2026'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Duration</Label><Select value={String(formData.duration ?? '')} onValueChange={v => setField('duration', v)}><SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger><SelectContent>{['1 Semester', '2 Semesters'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Reason</Label><Textarea value={String(formData.reason ?? '')} onChange={e => setField('reason', e.target.value)} /></div>
                <div className="space-y-1"><Label>Supporting Document Note</Label><Input value={String(formData.supporting_document_note ?? 'I will provide supporting documents')} onChange={e => setField('supporting_document_note', e.target.value)} /></div>
              </>
            )}

            {activeType === 'tuition_refund' && (
              <>
                <div className="space-y-1"><Label>Semester</Label><Select value={String(formData.semester ?? '')} onValueChange={v => setField('semester', v)}><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent>{['Spring 2026', 'Fall 2025'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Reason</Label><Select value={String(formData.reason ?? '')} onValueChange={v => setField('reason', v)}><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger><SelectContent>{['Withdrawal', 'Overpayment', 'Scholarship Applied', 'Medical Leave'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Amount Requested</Label><Input type="number" min={0} step={0.01} value={String(formData.amount_requested ?? '')} onChange={e => setField('amount_requested', Number(e.target.value))} /></div>
                <div className="space-y-1"><Label>Bank Account Note</Label><Input value={String(formData.bank_account_note ?? 'Please process to my registered bank account')} onChange={e => setField('bank_account_note', e.target.value)} /></div>
                <div className="space-y-1"><Label>Explanation</Label><Textarea value={String(formData.explanation ?? '')} onChange={e => setField('explanation', e.target.value)} /></div>
              </>
            )}

            {activeType === 'change_of_degree_plan' && (
              <>
                <div className="space-y-1"><Label>Current Plan</Label><Input value={String(formData.current_plan ?? `${profile?.major || 'Current'} Plan`)} onChange={e => setField('current_plan', e.target.value)} /></div>
                <div className="space-y-1"><Label>Requested Plan</Label><Input value={String(formData.requested_plan ?? '')} onChange={e => setField('requested_plan', e.target.value)} /></div>
                <div className="space-y-1"><Label>Reason</Label><Textarea value={String(formData.reason ?? '')} onChange={e => setField('reason', e.target.value)} /></div>
              </>
            )}

            {activeType === 'attestation_letter' && (
              <>
                <div className="space-y-1"><Label>Purpose</Label><Select value={String(formData.purpose ?? '')} onValueChange={v => setField('purpose', v)}><SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger><SelectContent>{['Embassy/Visa', 'Employment', 'Bank', 'Government Entity', 'Other'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Recipient Name</Label><Input value={String(formData.recipient_name ?? '')} onChange={e => setField('recipient_name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Language</Label><Select value={String(formData.language ?? '')} onValueChange={v => setField('language', v)}><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent>{['English', 'Arabic', 'Both'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Copies Needed (1-5)</Label><Input type="number" min={1} max={5} value={String(formData.copies_needed ?? 1)} onChange={e => setField('copies_needed', Number(e.target.value))} /></div>
              </>
            )}

            <div className="space-y-1">
              <Label>Student Note (optional)</Label>
              <Textarea value={studentNote} onChange={e => setStudentNote(e.target.value)} placeholder="Any additional notes for admin review..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" disabled={!isValid || submitting} onClick={() => void submit()}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
