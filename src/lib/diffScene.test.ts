import { describe, expect, it } from 'vitest'
import { diffScenes, validKeys } from './diffScene'

const ALT = `# Im Kontor

**SCROOGE:** Was wollen Sie zu dieser Stunde?

*Er zeigt auf das Namensschild.*

**HARTY:** Wir sammeln für die Armen, Sir.

**SCROOGE:** Gibt es keine Gefängnisse mehr?`

describe('diffScenes', () => {
  it('behält alles, wenn sich nichts ändert', () => {
    const diff = diffScenes(ALT, ALT)
    expect(diff.kept).toHaveLength(3)
    expect(diff.changed).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it('setzt nur die geänderte Replik zurück', () => {
    const neu = ALT.replace('Gibt es keine Gefängnisse mehr?', 'Gibt es denn keine Gefängnisse mehr?')
    const diff = diffScenes(ALT, neu)
    expect(diff.kept.map((i) => i.speaker)).toEqual(['SCROOGE', 'HARTY'])
    expect(diff.changed).toHaveLength(1)
    expect(diff.changed[0].text).toContain('denn')
    expect(diff.removed).toHaveLength(1)
  })

  it('zählt eine verschobene Replik als unverändert', () => {
    const neu = `# Im Kontor

**HARTY:** Wir sammeln für die Armen, Sir.

**SCROOGE:** Was wollen Sie zu dieser Stunde?

**SCROOGE:** Gibt es keine Gefängnisse mehr?`
    const diff = diffScenes(ALT, neu)
    expect(diff.changed).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
    expect(diff.kept).toHaveLength(3)
  })

  it('erkennt eine eingefügte Replik als neu, ohne den Rest anzufassen', () => {
    const neu = ALT + '\n\n**SCROOGE:** Und die Armenhäuser?'
    const diff = diffScenes(ALT, neu)
    expect(diff.kept).toHaveLength(3)
    expect(diff.changed).toHaveLength(1)
    expect(diff.removed).toHaveLength(0)
  })

  it('merkt eine geänderte Regieanweisung nicht als Replik-Änderung', () => {
    const neu = ALT.replace('*Er zeigt auf das Namensschild.*', '*Er dreht sich weg.*')
    const diff = diffScenes(ALT, neu)
    expect(diff.changed).toHaveLength(0)
    expect(diff.kept).toHaveLength(3)
  })

  it('kennt die gültigen Schlüssel der neuen Fassung', () => {
    const keys = validKeys(ALT)
    const diff = diffScenes(ALT, ALT)
    for (const item of diff.kept) expect(keys.has(item.key)).toBe(true)
  })
})
