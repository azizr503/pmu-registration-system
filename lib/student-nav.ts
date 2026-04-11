import type { PortalNavItem } from '@/components/portal/PortalShell'

export const STUDENT_NAV: PortalNavItem[] = [
  { href: '/student/dashboard', label: 'Dashboard', iconSrc: '/img/home.svg', iconAlt: 'Dashboard' },
  { href: '/student/register', label: 'Register Classes', iconSrc: '/img/book-open.svg', iconAlt: 'Register classes' },
  { href: '/student/schedule', label: 'My Schedule', iconSrc: '/img/calendar.svg', iconAlt: 'Schedule' },
  { href: '/student/grades', label: 'Grades & Transcript', iconSrc: '/img/bar-chart.svg', iconAlt: 'Grades' },
  {
    href: '/student/chatbot',
    label: 'AI Assistant',
    badge: 'NEW',
    iconSrc: '/img/message-circle.svg',
    iconAlt: 'AI Assistant',
  },
  { href: '/student/profile', label: 'My Profile', iconSrc: '/img/user.svg', iconAlt: 'Profile' },
  { href: '/student/accounts', label: 'Student Accounts', iconSrc: '/img/credit-card.svg', iconAlt: 'Accounts' },
  { href: '/student/eforms', label: 'eForms', iconSrc: '/img/file-text.svg', iconAlt: 'eForms' },
]
