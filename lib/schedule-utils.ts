function parseDays(s: string): Set<string> {
  if (!s) return new Set()
  const parts = s
    .split(/[,\/]/)
    .map(x => x.trim())
    .filter(Boolean)
  return new Set(parts)
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = toMinutes(aStart)
  const ae = toMinutes(aEnd)
  const bs = toMinutes(bStart)
  const be = toMinutes(bEnd)
  return as < be && bs < ae
}

export type SectionTimeFields = {
  semester: string
  days: string | null
  start_time: string | null
  end_time: string | null
}

export function sectionsTimeConflict(a: SectionTimeFields, b: SectionTimeFields): boolean {
  if (a.semester !== b.semester) return false
  const da = parseDays(a.days || '')
  const db = parseDays(b.days || '')
  for (const d of da) {
    if (db.has(d)) {
      if (!a.start_time || !a.end_time || !b.start_time || !b.end_time) return false
      if (timeRangesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) return true
    }
  }
  return false
}
