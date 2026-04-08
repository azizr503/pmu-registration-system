'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('students')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student' as 'student' | 'faculty' | 'admin',
  })

  const load = async () => {
    const r = await fetch('/api/admin/users')
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
      const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
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
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('User created')
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
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
                <div className="flex items-center gap-2">
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
          <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => setOpen(true)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as typeof f.role }))}
              >
                <option value="student">student</option>
                <option value="faculty">faculty</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#e05a00] text-white hover:bg-[#c94f00]" onClick={() => void addUser()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
