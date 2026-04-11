import type { PortalNavItem } from '@/components/portal/PortalShell'

export const FACULTY_NAV: PortalNavItem[] = [
  { href: '/faculty/dashboard', label: 'Home', iconSrc: '/img/home.svg', iconAlt: 'Home' },
  { href: '/faculty/courses', label: 'My Courses', iconSrc: '/img/book-open.svg', iconAlt: 'Courses' },
  {
    href: '/faculty/grades',
    label: 'Grade Submission Status',
    iconSrc: '/img/clipboard-list.svg',
    iconAlt: 'Grades',
  },
  { href: '/faculty/office-hours', label: 'Office Hours', iconSrc: '/img/clock.svg', iconAlt: 'Office hours' },
  { href: '/faculty/profile', label: 'My Profile', iconSrc: '/img/user.svg', iconAlt: 'Profile' },
]
