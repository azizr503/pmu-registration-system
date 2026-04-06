'use client'

import { useEffect, useState } from 'react'
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type U = {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  externalId: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
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

  const filterRole = (role: string) => users.filter(u => u.role === role)

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
    const ids = Object.keys(selected).filter(k => selected[k])
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={list.length > 0 && list.every(u => selected[u.id])}
              onCheckedChange={v => {
                const next = { ...selected }
                for (const u of list) next[u.id] = Boolean(v)
                setSelected(next)
              }}
            />
          </TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last login</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map(u => (
          <TableRow key={u.id}>
            <TableCell>
              <Checkbox
                checked={!!selected[u.id]}
                onCheckedChange={v => setSelected(s => ({ ...s, [u.id]: Boolean(v) }))}
              />
            </TableCell>
            <TableCell className="font-mono text-xs">{u.externalId || u.id.slice(0, 8)}</TableCell>
            <TableCell>{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch checked={u.status === 'active'} onCheckedChange={c => void toggle(u.id, c ? 'active' : 'inactive')} />
                <span className="text-xs">{u.status}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{u.lastLogin || '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1a5fb4]">Users</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void bulk('active')}>
            Bulk activate
          </Button>
          <Button variant="outline" onClick={() => void bulk('inactive')}>
            Bulk deactivate
          </Button>
          <Button className="bg-[#1a5fb4]" onClick={() => setOpen(true)}>
            Add User
          </Button>
        </div>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <UserTable list={filterRole('student')} />
        </TabsContent>
        <TabsContent value="faculty">
          <UserTable list={filterRole('faculty')} />
        </TabsContent>
        <TabsContent value="admins">
          <UserTable list={filterRole('admin')} />
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
            <Button className="bg-[#1a5fb4]" onClick={() => void addUser()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
