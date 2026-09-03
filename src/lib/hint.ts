import { stripMarkup } from './parser'

export interface HintStage {
  label: string
  /** Maskierter Text für diese Stufe */
  render(text: string): string
}

const MASK = '‧'

function maskWord(word: string, revealed: number): string {
  let shown = 0
  return [...word]
    .map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) return ch // Satzzeichen bleiben sichtbar
      if (shown < revealed) {
        shown++
        return ch
      }
      return MASK
    })
    .join('')
}

function words(text: string): string[] {
  return stripMarkup(text).split(/\s+/).filter(Boolean)
}

/** Erste `n` Wörter im Klartext, der Rest nur mit Anfangsbuchstaben. */
function partial(text: string, n: number): string {
  return words(text)
    .map((w, i) => (i < n ? w : maskWord(w, 1)))
    .join(' ')
}

export const HINT_STAGES: HintStage[] = [
  {
    label: 'Verdeckt',
    render: (text) => words(text).map((w) => maskWord(w, 0)).join(' '),
  },
  {
    label: 'Erstes Wort',
    render: (text) => partial(text, 1),
  },
  {
    label: 'Anfangsbuchstaben',
    render: (text) => words(text).map((w) => maskWord(w, 1)).join(' '),
  },
  {
    label: 'Erste Hälfte',
    render: (text) => partial(text, Math.ceil(words(text).length / 2)),
  },
]

export const MAX_HINT = HINT_STAGES.length - 1
