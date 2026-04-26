/** Grade scale from spec (percentage). */
export function numericToLetter(pct: number): string {
  if (pct >= 95) return 'A+'
  if (pct >= 90) return 'A'
  if (pct >= 85) return 'B+'
  if (pct >= 80) return 'B'
  if (pct >= 75) return 'C+'
  if (pct >= 70) return 'C'
  if (pct >= 65) return 'D+'
  if (pct >= 60) return 'D'
  return 'F'
}

export function weightedGrade(
  midterm: number | null,
  final: number | null,
  assignment: number | null,
  w: { mid: number; fin: number; asg: number }
): number {
  const m = midterm ?? 0
  const f = final ?? 0
  const a = assignment ?? 0
  return m * w.mid + f * w.fin + a * w.asg
}
