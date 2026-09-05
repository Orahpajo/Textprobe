import { describe, expect, it } from 'vitest'
import { isOwnLine, parseScene, splitSpeakers, stripMarkup } from './parser'
import { maskedText, maxHintLevel } from './hint'
import { difficultyLevel } from './difficulty'

const SZENE = `# Szene 3 – Im Kontor

**SCROOGE:** Was wollen Sie zu dieser Stunde?

*Er zeigt auf das Namensschild an der Tür.*

**HARTY & JOLLYGOODE:** Wir sammeln für die Armen, Sir.

**SCROOGE**: Gibt es keine Gefängnisse mehr?

Und die Armenhäuser, sind die etwa geschlossen?`

describe('parseScene', () => {
  const parsed = parseScene(SZENE)

  it('liest den Titel aus der H1', () => {
    expect(parsed.title).toBe('Szene 3 – Im Kontor')
  })

  it('erkennt Sprecher in beiden Doppelpunkt-Schreibweisen', () => {
    const speakers = parsed.items.filter((i) => i.kind === 'dialogue').map((i: any) => i.speaker)
    expect(speakers).toEqual(['SCROOGE', 'HARTY & JOLLYGOODE', 'SCROOGE'])
  })

  it('erkennt kursive Absätze als Handlung', () => {
    const stage = parsed.items.find((i) => i.kind === 'stage')
    expect(stage?.text).toBe('Er zeigt auf das Namensschild an der Tür.')
  })

  it('hängt Folgeabsätze an die vorherige Replik', () => {
    const last = parsed.items[parsed.items.length - 1]
    expect(last.text).toContain('Armenhäuser')
    expect(last.kind).toBe('dialogue')
  })

  it('listet Protagonisten inklusive Doppelsprecher', () => {
    expect(parsed.roles.map((r) => r.name)).toEqual(['SCROOGE', 'HARTY', 'JOLLYGOODE'])
    expect(parsed.roles[0].lineCount).toBe(2)
  })

  it('vergibt stabile Schlüssel, auch bei doppeltem Text', () => {
    const keys = parsed.items.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
    // Gleicher Text an anderer Stelle -> gleicher Hash, andere Laufnummer
    const twice = parseScene('**A:** Hallo\n\n**B:** Zwischenruf\n\n**A:** Hallo')
    expect(twice.items[0].key.split('#')[0]).toBe(twice.items[2].key.split('#')[0])
    expect(twice.items[0].key).not.toBe(twice.items[2].key)
  })

  it('erkennt eigene Repliken auch in Sprecherkombinationen', () => {
    const combo = parsed.items[2]
    expect(isOwnLine(combo, 'harty')).toBe(true)
    expect(isOwnLine(combo, 'SCROOGE')).toBe(false)
    expect(isOwnLine(parsed.items[1], 'SCROOGE')).toBe(false) // Handlung zählt nicht
  })

  it('bleibt bei Umsortierung des Markdowns beim gleichen Schlüssel', () => {
    const moved = parseScene(`**SCROOGE:** Was wollen Sie zu dieser Stunde?`)
    expect(moved.items[0].key).toBe(parsed.items[0].key)
  })
})

describe('splitSpeakers', () => {
  it('trennt an &, / und "und"', () => {
    expect(splitSpeakers('HARTY & JOLLYGOODE')).toEqual(['HARTY', 'JOLLYGOODE'])
    expect(splitSpeakers('A / B')).toEqual(['A', 'B'])
    expect(splitSpeakers('ANNA und BERT')).toEqual(['ANNA', 'BERT'])
  })
})

describe('stripMarkup', () => {
  it('entfernt fett und kursiv', () => {
    expect(stripMarkup('*leise* Ich **kann** nicht.')).toBe('leise Ich kann nicht.')
  })
})

describe('Tipp-Stufen', () => {
  const text = 'Gibt es keine Gefängnisse mehr?'

  it('gibt pro Stufe einen Buchstaben je Wort mehr frei', () => {
    expect(maskedText(text, 0)).toBe('‧‧‧‧ ‧‧ ‧‧‧‧‧ ‧‧‧‧‧‧‧‧‧‧‧ ‧‧‧‧?')
    expect(maskedText(text, 1)).toBe('G‧‧‧ e‧ k‧‧‧‧ G‧‧‧‧‧‧‧‧‧‧ m‧‧‧?')
    expect(maskedText(text, 2)).toBe('Gi‧‧ es ke‧‧‧ Ge‧‧‧‧‧‧‧‧‧ me‧‧?')
  })

  it('behält Wortzahl und Satzzeichen auf jeder Stufe', () => {
    for (const level of [0, 1, 3, 99]) {
      const masked = maskedText(text, level)
      expect(masked.split(' ')).toHaveLength(5)
      expect(masked.endsWith('?')).toBe(true)
    }
  })

  it('deckt auf der höchsten Stufe alles auf', () => {
    const max = maxHintLevel(text)
    expect(max).toBe('Gefängnisse'.length)
    expect(maskedText(text, max)).toBe(text)
    expect(maskedText(text, max)).not.toContain('‧')
  })

  it('kürzere Wörter bleiben vollständig, statt Füllzeichen zu bekommen', () => {
    expect(maskedText('es', 5)).toBe('es')
  })
})

describe('difficultyLevel', () => {
  const base = { lineKey: 'x', lastReviewedAt: null }
  it('stuft ungeübte und vergessene Stellen ein', () => {
    expect(difficultyLevel(undefined)).toBe('neu')
    expect(
      difficultyLevel({ ...base, seen: 4, known: 1, forgotten: 3, streak: 0, lastResult: 'forgot' }),
    ).toBe('hart')
    expect(
      difficultyLevel({ ...base, seen: 4, known: 4, forgotten: 0, streak: 4, lastResult: 'known' }),
    ).toBe('sitzt')
  })
})
