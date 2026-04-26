export function letterToPoints(letter: string | null | undefined): number {
  if (!letter) return 0
  const L = letter.trim().toUpperCase()
  const map: Record<string, number> = {
    'A+': 4.0,
    A: 4.0,
    'A-': 3.7,
    'B+': 3.3,
    B: 3.0,
    'B-': 2.7,
    'C+': 2.3,
    C: 2.0,
    'C-': 1.7,
    'D+': 1.3,
    D: 1.0,
    'D-': 0.7,
    F: 0,
  }
  return map[L] ?? 0
}

export function gradeColorClass(letter: string | null | undefined): string {
  if (!letter) return 'text-muted-foreground'
  const L = letter.trim().toUpperCase()
  if (L.startsWith('A')) return 'text-emerald-600 dark:text-emerald-400'
  if (L.startsWith('B')) return 'text-blue-600 dark:text-blue-400'
  if (L.startsWith('C')) return 'text-amber-600 dark:text-amber-400'
  if (L.startsWith('D') || L === 'F') return 'text-red-600 dark:text-red-400'
  return 'text-foreground'
}
