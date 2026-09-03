export interface LineStat {
  lineKey: string
  seen: number
  known: number
  forgotten: number
  /** Aktuelle Serie an "gewusst" in Folge */
  streak: number
  lastResult: 'known' | 'forgot' | null
  lastReviewedAt: string | null
}

export const EMPTY_STAT: Omit<LineStat, 'lineKey'> = {
  seen: 0,
  known: 0,
  forgotten: 0,
  streak: 0,
  lastResult: null,
  lastReviewedAt: null,
}

/** 0 = sitzt, 1 = sehr schwierig. Ungeübte Stellen liegen bewusst in der Mitte. */
export function difficultyScore(stat?: LineStat | null): number {
  if (!stat || stat.seen === 0) return 0.5
  const base = stat.forgotten / stat.seen
  const recency =
    stat.lastResult === 'forgot' ? 0.35 : stat.streak >= 3 ? -0.3 : stat.streak >= 1 ? -0.12 : 0
  return Math.min(1, Math.max(0, base + recency))
}

export type DifficultyLevel = 'neu' | 'sitzt' | 'fast' | 'wackelig' | 'hart'

export function difficultyLevel(stat?: LineStat | null): DifficultyLevel {
  if (!stat || stat.seen === 0) return 'neu'
  const score = difficultyScore(stat)
  if (score >= 0.6) return 'hart'
  if (score >= 0.3) return 'wackelig'
  if (score > 0.05) return 'fast'
  return 'sitzt'
}

export const LEVEL_LABEL: Record<DifficultyLevel, string> = {
  neu: 'noch nicht geübt',
  sitzt: 'sitzt',
  fast: 'sitzt fast',
  wackelig: 'wackelig',
  hart: 'schwierig',
}
