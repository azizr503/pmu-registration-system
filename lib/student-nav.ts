import type { PortalNavItem } from '@/components/portal/PortalShell'

export const STUDENT_NAV: PortalNavItem[] = [
  { href: '/student/dashboard', label: '🏠 Home' },
  { href: '/student/register', label: '📚 Register Classes' },
  { href: '/student/schedule', label: '🗓️ My Schedule' },
  { href: '/student/grades', label: '📊 Grades & Transcript' },
  { href: '/student/chatbot', label: '💬 AI Assistant', badge: 'NEW' },
  { href: '/student/profile', label: '👤 My Profile' },
  { href: '/student/accounts', label: '💰 Student Accounts' },
  { href: '/student/eforms', label: '📋 eForms' },
]
