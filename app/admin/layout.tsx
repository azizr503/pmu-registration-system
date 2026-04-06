'use client'

import { PortalShell } from '@/components/portal/PortalShell'
import { ADMIN_NAV } from '@/lib/admin-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalTitle="Admin" nav={ADMIN_NAV}>{children}</PortalShell>
}
