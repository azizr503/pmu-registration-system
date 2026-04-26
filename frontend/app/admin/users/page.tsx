'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { apiUrl } from '@/lib/api-base'

type U = {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  externalId: string
}

function formatLastLogin(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function roleBadge(role: string) {
  if (role === 'student') return <Badge className="bg-[#1a5fb4] text-white hover:bg-[#1a5fb4]">Student</Badge>
  if (role === 'faculty') return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Faculty</Badge>
  return <Badge className="bg-purple-600 text-white hover:bg-purple-600">Admin</Badge>
}

const MAJOR_OPTIONS = [
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cybersecurity',
] as const

const LEVEL_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior'] as const

const FACULTY_DEPARTMENTS = [
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Cybersecurity',
  'Mathematics',
  'Physics',
  'English',
] as const

type AddUserFormState = {
  full_name: string
  email: string
  password: string
  role: 'student' | 'faculty' | 'admin'
  status: 'active' | 'inactive'
  student_id: string
  major: string
  level: string
  gpa: string
  credits_completed: string
  phone: string
  emergency_contact: string
  faculty_id: string
  department: string
  office_location: string
  office_hours: string
}

function randomDigits(len: number) {
  let s = ''
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  for (let i = 0; i < len; i++) s += String(arr[i]! % 10)
  return s
}

function newStudentPair() {
  const id = randomDigits(7)
  return { student_id: `s.${id}`, email: `s.${id}@pmu.edu.sa` }
}

function newFacultyPair() {
  const id = randomDigits(6)
  return { faculty_id: `f.${id}`, email: `f.${id}@pmu.edu.sa` }
}

function buildAddUserForm(role: AddUserFormState['role'] = 'student'): AddUserFormState {
  const sp = newStudentPair()
  const fp = newFacultyPair()
  return {
    full_name: '',
    email: role === 'faculty' ? fp.email : role === 'admin' ? '' : sp.email,
    password: '',
    role,
    status: 'active',
    student_id: sp.student_id,
    major: 'Computer Science',
    level: 'Freshman',
    gpa: '0.00',
    credits_completed: '0',
    phone: '',
    emergency_contact: '',
    faculty_id: fp.faculty_id,
    department: 'Computer Science',
    office_location: '',
    office_hours: '',
  }
}

function generateClientPassword(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  let s = ''
  for (let i = 0; i < length; i++) s += chars[arr[i]! % chars.length]
  return s
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    if (typeof data.error === 'string' && data.error.trim()) return data.error
    if (typeof data.message === 'string' && data.message.trim()) return data.message
  } catch {
    // Ignore JSON parsing errors and use fallback text.
  }
  return `Request failed (${response.status})`
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('students')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AddUserFormState>(() => buildAddUserForm())
  const [deleteTarget, setDeleteTarget] = useState<U | null>(null)
  const [deleting, setDeleting] = useState(false)

  const adminCount = useMemo(() => users.filter(u => u.role === 'admin').length, [users])

  const canDeleteUser = (u: U) => {
    if (authUser?.id && u.id === authUser.id) return false
    if (u.role === 'admin' && adminCount <= 1) return false
    return true
  }

  const load = async () => {
    const r = await fetch(apiUrl('/admin/users'), { credentials: 'include' })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    setUsers(d.users)
  }

  useEffect(() => {
    void load()
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const filterList = useMemo(() => {
    return (role: 'student' | 'faculty' | 'admin') => {
      const list = users.filter(u => u.role === role)
      const q = search.trim().toLowerCase()
      if (!q) return list
      return list.filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.externalId.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      )
    }
  }, [users, search])

  const toggle = async (id: string, status: 'active' | 'inactive') => {
    try {
      const r = await fetch(apiUrl(`/admin/users/${id}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Updated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const bulk = async (status: 'active' | 'inactive') => {
    const currentList = filterList(
      tab === 'students' ? 'student' : tab === 'faculty' ? 'faculty' : 'admin'
    )
    const ids = Object.keys(selected).filter(k => selected[k] && currentList.some(u => u.id === k))
    for (const id of ids) {
      await toggle(id, status)
    }
    setSelected({})
  }

  const addUser = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Full name and email are required')
      return
    }
    if (form.role === 'student') {
      const gpaN = parseFloat(form.gpa)
      if (Number.isNaN(gpaN) || gpaN < 0 || gpaN > 4) {
        toast.error('GPA must be between 0.00 and 4.00')
        return
      }
      const cr = parseInt(form.credits_completed, 10)
      if (Number.isNaN(cr) || cr < 0) {
        toast.error('Credits completed must be zero or a positive integer')
        return
      }
    }
    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        status: form.status,
      }
      if (form.role === 'student') {
        payload.student_id = form.student_id.trim()
        payload.major = form.major
        payload.level = form.level
        payload.gpa = parseFloat(form.gpa) || 0
        payload.credits_completed = parseInt(form.credits_completed, 10) || 0
        payload.phone = form.phone.trim()
        payload.emergency_contact = form.emergency_contact.trim()
      } else if (form.role === 'faculty') {
        payload.faculty_id = form.faculty_id.trim()
        payload.department = form.department
        payload.office_location = form.office_location.trim()
        payload.office_hours = form.office_hours.trim()
        payload.phone = form.phone.trim()
      }

      const r = await fetch(apiUrl('/admin/users'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (r.status === 409) {
        toast.error('Email already in use')
        return
      }
      if (!r.ok) {
        toast.error(typeof d.error === 'string' ? d.error : 'Could not add user')
        return
      }
      toast.success('User added successfully')
      if (d.temporaryPassword && typeof d.temporaryPassword === 'string') {
        toast.message('Temporary password', {
          description: d.temporaryPassword,
          duration: 20000,
        })
      }
      setForm(buildAddUserForm())
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    const targetName = deleteTarget.name
    setDeleting(true)
    try {
      const r = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) {
        toast.error(await readErrorMessage(r))
        return
      }
      toast.success(`Deleted ${targetName}`)
      setUsers(prev => prev.filter(user => user.id !== targetId))
      setDeleteTarget(null)
      setSelected(s => {
        const next = { ...s }
        delete next[targetId]
        return next
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete user')
    } finally {
      setDeleting(false)
    }
  }

  const UserTable = ({ list }: { list: U[] }) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-[#1a5fb4]">
          <TableRow className="border-[#1a5fb4] hover:bg-[#1a5fb4]">
            <TableHead className="w-10 text-white">
              <Checkbox
                checked={list.length > 0 && list.every(u => selected[u.id])}
                onCheckedChange={v => {
                  const next = { ...selected }
                  for (const u of list) next[u.id] = Boolean(v)
                  setSelected(next)
                }}
              />
            </TableHead>
            <TableHead className="text-white">ID</TableHead>
            <TableHead className="text-white">Name</TableHead>
            <TableHead className="text-white">Email</TableHead>
            <TableHead className="text-white">Role</TableHead>
            <TableHead className="text-white">Status</TableHead>
            <TableHead className="text-white">Last login</TableHead>
            <TableHead className="w-[100px] text-white text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((u, i) => (
            <TableRow key={u.id} className={cn(i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]', selected[u.id] && 'ring-1 ring-[#1a5fb4]/30')}>
              <TableCell>
                <Checkbox
                  checked={!!selected[u.id]}
                  onCheckedChange={v => setSelected(s => ({ ...s, [u.id]: Boolean(v) }))}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{u.externalId || u.id.slice(0, 8)}</TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{roleBadge(u.role)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={u.status === 'active'}
                    onCheckedChange={c => void toggle(u.id, c ? 'active' : 'inactive')}
                    className={cn(
                      u.status === 'active'
                        ? 'data-[state=checked]:bg-emerald-600'
                        : 'data-[state=unchecked]:bg-red-500'
                    )}
                  />
                  <span className={cn('text-xs font-medium', u.status === 'active' ? 'text-emerald-700' : 'text-red-600')}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatLastLogin(u.lastLogin)}</TableCell>
              <TableCell className="text-right">
                {canDeleteUser(u) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                    aria-label={`Delete ${u.name}`}
                    onClick={() => setDeleteTarget(u)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Users</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-[#1a5fb4] text-[#1a5fb4]" onClick={() => void bulk('active')}>
            Bulk activate
          </Button>
          <Button variant="outline" className="border-red-500 text-red-600" onClick={() => void bulk('inactive')}>
            Bulk deactivate
          </Button>
          <Button
            className="bg-[#e05a00] text-white hover:bg-[#c94f00]"
            onClick={() => {
              setForm(buildAddUserForm())
              setOpen(true)
            }}
          >
            Add User
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by name, email, or ID…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Tabs
        value={tab}
        onValueChange={v => {
          setTab(v)
          setSelected({})
        }}
      >
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <UserTable list={filterList('student')} />
        </TabsContent>
        <TabsContent value="faculty">
          <UserTable list={filterList('faculty')} />
        </TabsContent>
        <TabsContent value="admins">
          <UserTable list={filterList('admin')} />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={openDlg => {
          if (!openDlg) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget ? <strong>{deleteTarget.name}</strong> : 'this user'}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-muted text-muted-foreground hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmDeleteUser()}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={open}
        onOpenChange={v => {
          setOpen(v)
          if (v) setForm(buildAddUserForm())
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1">
              <Label htmlFor="add-full-name">Full name</Label>
              <Input
                id="add-full-name"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Ali Al-Mutairi"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-email">Email (@pmu.edu.sa)</Label>
              <Input
                id="add-email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onBlur={() => {
                  setForm(f => {
                    if (f.role === 'student') {
                      const local = f.email.split('@')[0]?.trim().toLowerCase() ?? ''
                      if (!local.startsWith('s.')) return f
                      const rest = local.slice(2)
                      if (!rest) return f
                      return { ...f, student_id: `s.${rest}`, email: `${local}@pmu.edu.sa` }
                    }
                    if (f.role === 'faculty') {
                      const local = f.email.split('@')[0]?.trim().toLowerCase() ?? ''
                      if (!local.startsWith('f.')) return f
                      const rest = local.slice(2)
                      if (!rest) return f
                      return { ...f, faculty_id: `f.${rest}`, email: `${local}@pmu.edu.sa` }
                    }
                    return f
                  })
                }}
                placeholder="s.202099999@pmu.edu.sa"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Students: <span className="font-mono">s.XXXXXXX@pmu.edu.sa</span> · Faculty:{' '}
                <span className="font-mono">f.XXXXXX@pmu.edu.sa</span> · Admin: often{' '}
                <span className="font-mono">admin@pmu.edu.sa</span> or any @pmu.edu.sa for new admins
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="add-password">Password</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setForm(f => ({ ...f, password: generateClientPassword() }))}
                >
                  Generate password
                </Button>
              </div>
              <Input
                id="add-password"
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to auto-generate on save (min. 8 chars if you type one)"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={v => {
                  const role = v as AddUserFormState['role']
                  setForm(f => {
                    if (role === 'student') {
                      return {
                        ...buildAddUserForm('student'),
                        full_name: f.full_name,
                        password: f.password,
                        status: f.status,
                      }
                    }
                    if (role === 'faculty') {
                      return {
                        ...buildAddUserForm('faculty'),
                        full_name: f.full_name,
                        password: f.password,
                        status: f.status,
                      }
                    }
                    return {
                      ...buildAddUserForm('admin'),
                      full_name: f.full_name,
                      password: f.password,
                      status: f.status,
                    }
                  })
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as typeof f.status }))}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'student' && (
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label htmlFor="add-student-id">Student ID</Label>
                  <Input
                    id="add-student-id"
                    value={form.student_id}
                    onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                    onBlur={() => {
                      setForm(f => {
                        let x = f.student_id.trim().replace(/^s\./i, '')
                        if (!x) return f
                        return { ...f, student_id: `s.${x}`, email: `s.${x}@pmu.edu.sa` }
                      })
                    }}
                    placeholder="s.202099999"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Must match the s. prefix of the email.</p>
                </div>
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label>Major</Label>
                  <Select value={form.major} onValueChange={v => setForm(f => ({ ...f, major: v }))}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Major" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAJOR_OPTIONS.map(m => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Academic level</Label>
                  <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map(l => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-gpa">GPA (0.00 – 4.00)</Label>
                  <Input
                    id="add-gpa"
                    type="number"
                    min={0}
                    max={4}
                    step={0.01}
                    value={form.gpa}
                    onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-credits">Credits completed</Label>
                  <Input
                    id="add-credits"
                    type="number"
                    min={0}
                    step={1}
                    value={form.credits_completed}
                    onChange={e => setForm(f => ({ ...f, credits_completed: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-student-phone">Phone</Label>
                  <Input
                    id="add-student-phone"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+966…"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-emergency">Emergency contact</Label>
                  <Input
                    id="add-emergency"
                    value={form.emergency_contact}
                    onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
                    placeholder="Name / phone"
                  />
                </div>
              </div>
            )}

            {form.role === 'faculty' && (
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label htmlFor="add-faculty-id">Faculty ID</Label>
                  <Input
                    id="add-faculty-id"
                    value={form.faculty_id}
                    onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}
                    onBlur={() => {
                      setForm(f => {
                        let x = f.faculty_id.trim().replace(/^f\./i, '')
                        if (!x) return f
                        return { ...f, faculty_id: `f.${x}`, email: `f.${x}@pmu.edu.sa` }
                      })
                    }}
                    placeholder="f.100001"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Must match the f. prefix of the email.</p>
                </div>
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTY_DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="add-office-loc">Office location</Label>
                  <Input
                    id="add-office-loc"
                    value={form.office_location}
                    onChange={e => setForm(f => ({ ...f, office_location: e.target.value }))}
                    placeholder="Building 3, Room 210"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="add-office-hrs">Office hours</Label>
                  <Input
                    id="add-office-hrs"
                    value={form.office_hours}
                    onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))}
                    placeholder="Sun–Thu 12:00–14:00"
                  />
                </div>
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label htmlFor="add-faculty-phone">Phone</Label>
                  <Input
                    id="add-faculty-phone"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+966…"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => void addUser()}>
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
