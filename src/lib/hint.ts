import { stripMarkup } from './parser'

const MASK = '‧'

function words(text: string): string[] {
  return stripMarkup(text).split(/\s+/).filter(Boolean)
}

function letters(word: string): number {
  return [...word].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length
}

/** Gibt die ersten `revealed` Buchstaben eines Wortes frei; Satzzeichen bleiben sichtbar. */
function maskWord(word: string, revealed: number): string {
  let shown = 0
  return [...word]
    .map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) return ch
      if (shown < revealed) {
        shown++
        return ch
      }
      return MASK
    })
    .join('')
}

/**
 * Verdeckte Replik auf Tipp-Stufe `level`: Jede Stufe gibt pro Wort einen
 * Buchstaben mehr frei – Stufe 0 verdeckt alles, Stufe 1 zeigt die
 * Anfangsbuchstaben.
 */
export function maskedText(text: string, level: number): string {
  return words(text)
    .map((word) => maskWord(word, Math.max(0, level)))
    .join(' ')
}

/** Ab dieser Stufe ist das längste Wort vollständig aufgedeckt. */
export function maxHintLevel(text: string): number {
  return words(text).reduce((max, word) => Math.max(max, letters(word)), 0)
}
