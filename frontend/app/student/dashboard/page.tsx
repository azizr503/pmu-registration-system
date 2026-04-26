'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudentOverview, getStudentSchedule } from '@/lib/api/student'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function parseDays(days: string | null): string[] {
  if (!days) return []
  return days.split(/[,\s]+/).map(d => d.trim()).filter(Boolean)
}

function sectionOnDate(days: string | null, date: Date): boolean {
  const key = DAY_ABBREVS[date.getDay()]
  return parseDays(days).includes(key)
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null
  const p = hhmm.trim().split(':')
  const h = Number(p[0])
  const m = Number(p[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatTime12(hhmm: string | null): string {
  const t = toMinutes(hhmm)
  if (t === null) return '—'
  const h = Math.floor(t / 60)
  const m = t % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

type SectionRow = {
  id: string
  course_code: string
  course_title: string
  days: string | null
  start_time: string | null
  end_time: string | null
  room: string | null
}

type TodayItem = SectionRow & {
  status: 'in_progress' | 'next' | 'later' | 'done'
}

function buildTodaySchedule(sections: SectionRow[], now: Date): TodayItem[] {
  const today = sections.filter(s => sectionOnDate(s.days, now))
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const withStart = today
    .map(s => ({
      s,
      start: toMinutes(s.start_time),
      end: toMinutes(s.end_time),
    }))
    .filter((x): x is typeof x & { start: number; end: number } => x.start !== null && x.end !== null)
    .sort((a, b) => a.start - b.start)

  let assignedNext = false
  return withStart.map(({ s, start, end }) => {
    if (nowMin >= start && nowMin < end) {
      return { ...s, status: 'in_progress' as const }
    }
    if (nowMin >= end) {
      return { ...s, status: 'done' as const }
    }
    if (!assignedNext) {
      assignedNext = true
      return { ...s, status: 'next' as const }
    }
    return { ...s, status: 'later' as const }
  })
}

function ProgressBar({ current, max, className }: { current: number; max: number; className?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((current / max) * 100))
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-[#1a5fb4]/12 dark:bg-[#1a5fb4]/25', className)}
    >
      <div className="h-full rounded-full bg-[#1a5fb4] transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function formatTodayHeading(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    iconSrc: '/img/alert-triangle.svg',
    title: 'Registration deadline approaching – 5 days left',
    time: '1h ago',
  },
  {
    id: 'n2',
    iconSrc: '/img/clock.svg',
    title: 'CS301 section added – new seats available',
    time: '3h ago',
  },
  {
    id: 'n3',
    iconSrc: '/img/check-circle.svg',
    title: 'Successfully enrolled in MATH201',
    time: '1d ago',
  },
] as const

const DEGREE_BREAKDOWN = [
  { label: 'Core Requirements', current: 48, max: 72 },
  { label: 'Electives', current: 12, max: 36 },
  { label: 'General Education', current: 6, max: 18 },
  { label: 'Free Electives', current: 0, max: 6 },
] as const

export default function StudentDashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentOverview>> | null>(null)
  const [todaySections, setTodaySections] = useState<TodayItem[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const overview = await getStudentOverview()
        if (cancelled) return
        setData(overview)
        const sched = await getStudentSchedule(overview.registration.semester)
        if (cancelled) return
        setTodaySections(buildTodaySchedule(sched.sections as SectionRow[], new Date()))
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  if (err || !data) {
    return <p className="text-destructive">{err || 'Unable to load dashboard.'}</p>
  }

  const sem = data.registration.semester
  const degreeLabel = data.student.major
    ? `${data.student.major} - B.Sc.`
    : 'Computer Science - B.Sc.'
  const totalDone = data.student.creditsCompleted
  const totalNeed = data.student.requiredCredits

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-[#1a5fb4]/25 bg-[#1a5fb4] px-4 py-3 text-white">
        <img
          src="/img/bell.svg"
          alt=""
          className="mt-0.5 h-5 w-5 shrink-0 opacity-95 brightness-0 invert"
          width={20}
          height={20}
        />
        <p className="text-sm font-semibold leading-snug sm:text-base">
          Hello, {data.student.name} — {sem} registration is {data.registration.isOpen ? 'open' : 'closed'}.
        </p>
      </div>

      {/* Row 1: stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 border-t-4 border-t-[#1a5fb4] bg-white shadow-sm dark:border-[#2a2d3e] dark:bg-[#1e2130]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#9ca3af]">
              Registered Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#1a5fb4] dark:text-[#93c5fd]">
            <span>{data.student.registeredCredits}</span>
            <img
              src="/img/book-open.svg"
              alt=""
              className="h-7 w-7 shrink-0 dark:invert"
              width={28}
              height={28}
            />
          </CardContent>
        </Card>
        <Card className="border border-gray-200 border-t-4 border-t-[#15803d] bg-white shadow-sm dark:border-[#2a2d3e] dark:bg-[#1e2130]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#9ca3af]">GPA</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#15803d] dark:text-emerald-400">
            <span>{data.student.gpa.toFixed(2)}</span>
            <img
              src="/img/trending-up.svg"
              alt=""
              className="h-7 w-7 shrink-0 dark:invert"
              width={28}
              height={28}
            />
          </CardContent>
        </Card>
        <Card className="border border-gray-200 border-t-4 border-t-[#7c3aed] bg-white shadow-sm dark:border-[#2a2d3e] dark:bg-[#1e2130]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#9ca3af]">
              Completed Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#7c3aed] dark:text-violet-400">
            <span>{data.student.creditsCompleted}</span>
            <img
              src="/img/check-circle.svg"
              alt=""
              className="h-7 w-7 shrink-0 dark:invert"
              width={28}
              height={28}
            />
          </CardContent>
        </Card>
        <Card className="border border-gray-200 border-t-4 border-t-[#e05a00] bg-white shadow-sm dark:border-[#2a2d3e] dark:bg-[#1e2130]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#9ca3af]">
              Remaining Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-[#e05a00] dark:text-orange-400">
            <span>{data.student.remainingHours}</span>
            <img
              src="/img/target.svg"
              alt=""
              className="h-7 w-7 shrink-0 dark:invert"
              width={28}
              height={28}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: degree + notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="border border-gray-200 bg-white shadow-md dark:border-[#2a2d3e] dark:bg-[#1e2130] lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Degree Progress</CardTitle>
            <p className="text-sm font-normal text-gray-600 dark:text-[#9ca3af]">{degreeLabel}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Total Credits</span>
                <span className="tabular-nums text-gray-600 dark:text-[#9ca3af]">
                  {totalDone} / {totalNeed}
                </span>
              </div>
              <ProgressBar current={totalDone} max={totalNeed} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {DEGREE_BREAKDOWN.map(row => (
                <div
                  key={row.label}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2a2d3e] dark:bg-[#1a1d27]"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium leading-tight text-gray-900 dark:text-white">{row.label}</span>
                    <span className="shrink-0 tabular-nums text-gray-600 dark:text-[#9ca3af]">
                      {row.current} / {row.max}
                    </span>
                  </div>
                  <ProgressBar current={row.current} max={row.max} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-md dark:border-[#2a2d3e] dark:bg-[#1e2130] lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Notifications</CardTitle>
            <p className="text-sm font-normal text-gray-600 dark:text-[#9ca3af]">Recent updates</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_NOTIFICATIONS.map(n => (
              <div
                key={n.id}
                className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-[#2a2d3e] dark:bg-[#1a1d27]"
              >
                <img
                  src={n.iconSrc}
                  alt=""
                  className="mt-0.5 h-5 w-5 shrink-0 dark:invert"
                  width={20}
                  height={20}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-gray-900 dark:text-white">{n.title}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-[#9ca3af]">{n.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: today */}
      <Card className="border border-gray-200 bg-white shadow-md dark:border-[#2a2d3e] dark:bg-[#1e2130]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-900 dark:text-white">Today&apos;s Schedule</CardTitle>
          <p className="text-sm font-normal text-gray-600 dark:text-[#9ca3af]">
            {formatTodayHeading(new Date())}
          </p>
        </CardHeader>
        <CardContent>
          {todaySections.length === 0 ? (
            <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-600 dark:border-[#2a2d3e] dark:text-[#9ca3af]">
              <span>No classes today</span>
              <img
                src="/img/check-circle.svg"
                alt=""
                className="h-5 w-5 shrink-0 dark:invert"
                width={20}
                height={20}
              />
            </p>
          ) : (
            <ul className="space-y-2">
              {todaySections.map(item => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-[#2a2d3e] dark:bg-[#1a1d27] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1a5fb4] dark:text-[#93c5fd]">
                      {formatTime12(item.start_time)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.course_code}{' '}
                        <span className="font-normal text-gray-600 dark:text-[#9ca3af]">
                          — {item.course_title}
                        </span>
                      </p>
                      <span
                        className={cn(
                          'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          item.status === 'in_progress' &&
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
                          item.status === 'next' &&
                            'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
                          item.status === 'later' &&
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
                          item.status === 'done' &&
                            'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400'
                        )}
                      >
                        {item.status === 'in_progress' && 'In Progress'}
                        {item.status === 'next' && 'Next'}
                        {item.status === 'later' && 'Later'}
                        {item.status === 'done' && 'Complete'}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm text-gray-600 dark:text-[#9ca3af] sm:text-right">
                    {item.room ? `Room ${item.room}` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
