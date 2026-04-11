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

const ADD_USER_DEFAULT = {
  full_name: '',
  email: '',
  password: '',
  role: 'student' as 'student' | 'faculty' | 'admin',
  status: 'active' as 'active' | 'inactive',
}

function generateClientPassword(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  let s = ''
  for (let i = 0; i < length; i++) s += chars[arr[i]! % chars.length]
  return s
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('students')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(ADD_USER_DEFAULT)
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
    try {
      const r = await fetch(apiUrl('/admin/users'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          role: form.role,
          status: form.status,
        }),
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
      setForm(ADD_USER_DEFAULT)
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const r = await fetch(apiUrl(`/admin/users/${deleteTarget.id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(typeof d.error === 'string' ? d.error : 'Could not delete user')
        return
      }
      toast.success('User deleted successfully')
      setDeleteTarget(null)
      setSelected(s => {
        const next = { ...s }
        delete next[deleteTarget.id]
        return next
      })
      await load()
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
              setForm(ADD_USER_DEFAULT)
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
          if (v) setForm(ADD_USER_DEFAULT)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
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
                placeholder="s.202099999@pmu.edu.sa"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Students: <span className="font-mono">s.XXXXXXX@pmu.edu.sa</span> · Faculty:{' '}
                <span className="font-mono">f.XXXXXXX@pmu.edu.sa</span> · Admin: often{' '}
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
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as typeof f.role }))}>
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
          </div>
          <DialogFooter>
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
