'use client'

import { PortalShell } from '@/components/portal/PortalShell'
import { FACULTY_NAV } from '@/lib/faculty-nav'

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalTitle="Faculty Portal" nav={FACULTY_NAV}>{children}</PortalShell>
}
