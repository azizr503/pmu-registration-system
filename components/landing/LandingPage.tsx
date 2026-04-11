'use client'

import Link from 'next/link'
import { Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { PmuLogo } from '@/components/pmu-logo'

const NAV = [
  { label: 'ADMISSIONS+AID', href: '#', active: true },
  { label: 'RESEARCH', href: '#', active: false },
  { label: 'ACADEMICS', href: '#', active: false },
  { label: 'ON CAMPUS', href: '#', active: false },
  { label: 'RESOURCES', href: '#', active: false },
]

function SocialIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[#4a5568] transition-colors hover:bg-black/5 hover:text-[#e05a00]"
    >
      {children}
    </a>
  )
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5] transition-colors duration-300 dark:bg-[#0f1117]">
      {/* Top utility bar */}
      <div className="border-b border-black/5 bg-white dark:border-[#2a2d3e] dark:bg-[#1a1d27]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login?role=faculty"
              className="font-medium text-[#4a5568] hover:text-[#e05a00] dark:text-[#9ca3af] dark:hover:text-[#e05a00]"
            >
              Faculty+Staff
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SocialIcon label="Twitter">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Facebook">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="YouTube">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Instagram">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </SocialIcon>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="border-b border-black/5 bg-white shadow-sm dark:border-[#2a2d3e] dark:bg-[#1a1d27]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <PmuLogo size="landing" />
          </Link>
          <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-1 md:order-2 md:w-auto md:justify-end md:gap-0 lg:gap-1">
            {NAV.map(item => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'px-2 py-2 text-xs font-semibold tracking-wide sm:text-sm',
                  item.active
                    ? 'text-[#e05a00]'
                    : 'text-[#4a5568] hover:text-[#e05a00] dark:text-[#9ca3af] dark:hover:text-[#e05a00]'
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="order-2 flex items-center gap-2 md:order-3">
            <button
              type="button"
              className="rounded-md p-2 text-[#4a5568] hover:bg-black/5 dark:text-[#9ca3af] dark:hover:bg-white/10"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-md p-2 text-[#4a5568] hover:bg-black/5 dark:text-[#9ca3af] dark:hover:bg-white/10"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative border-b border-black/5 bg-[#eceff3] dark:border-[#2a2d3e] dark:bg-[#1a1d27]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q15 10 30 30 T60 30' fill='none' stroke='%23d1d5db' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-12 text-center md:py-16">
          <h1 className="text-balance font-sans text-xl font-bold uppercase tracking-[0.12em] text-[#1e2a3a] dark:text-white md:text-2xl lg:text-3xl">
            Login to Banner Self Services
          </h1>
        </div>
      </section>

      {/* Portal cards */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <PortalCard
            title="Faculty Self Service"
            imageSrc="/img/faculty-service.jpg"
            imageAlt="Faculty collaborating in a meeting"
            buttonLabel="Click for Login"
            href="/login?role=faculty"
          />
          <PortalCard
            title="Student Self Service"
            imageSrc="/img/student-service.jpg"
            imageAlt="Student using Banner Self Services on a laptop"
            buttonLabel="Login here"
            href="/login?role=student"
          />
        </div>
      </section>
    </div>
  )
}

function PortalCard({
  title,
  imageSrc,
  imageAlt,
  buttonLabel,
  href,
}: {
  title: string
  imageSrc: string
  imageAlt: string
  buttonLabel: string
  href: string
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-[#2a2d3e] dark:bg-[#1e2130]">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#dfe4ea] md:h-[min(360px,45vh)]">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-6 text-center">
        <h2 className="text-lg font-semibold text-[#1e2a3a] dark:text-white md:text-xl">{title}</h2>
        <Link
          href={href}
          className="mt-5 inline-flex min-w-[160px] items-center justify-center border border-[#1e2a3a] bg-white px-6 py-2.5 text-sm font-medium text-[#1e2a3a] transition-colors hover:bg-[#1e2a3a] hover:text-white dark:border-[#93c5fd] dark:bg-[#1e2130] dark:text-[#93c5fd] dark:hover:bg-[#93c5fd] dark:hover:text-[#0f1117]"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  )
}
