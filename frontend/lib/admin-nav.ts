import type { PortalNavItem } from '@/components/portal/PortalShell'

export const ADMIN_NAV: PortalNavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', iconSrc: '/img/layout-dashboard.svg', iconAlt: 'Dashboard' },
  { href: '/admin/users', label: 'Users', iconSrc: '/img/users.svg', iconAlt: 'Users' },
  { href: '/admin/eforms', label: 'eForms', iconSrc: '/img/file-text.svg', iconAlt: 'eForms' },
  { href: '/admin/courses', label: 'Courses', iconSrc: '/img/book-open.svg', iconAlt: 'Courses' },
  { href: '/admin/registration-control', label: 'Registration', iconSrc: '/img/settings.svg', iconAlt: 'Registration' },
  {
    href: '/admin/ai-assistant',
    label: 'AI Assistant',
    badge: 'NEW',
    iconSrc: '/img/message-circle.svg',
    iconAlt: 'AI Assistant',
  },
]
