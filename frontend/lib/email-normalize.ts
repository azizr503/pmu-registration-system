/** Accepts full address or local part only (e.g. s.202012345). */
export function normalizePmuEmail(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  if (t.includes('@')) return t.toLowerCase()
  return `${t.toLowerCase()}@pmu.edu.sa`
}
