'use client'

import { PortalShell } from '@/components/portal/PortalShell'
import { STUDENT_NAV } from '@/lib/student-nav'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalTitle="Student Portal" nav={STUDENT_NAV}>{children}</PortalShell>
}
