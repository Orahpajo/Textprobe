/**
 * Parser für Szenen-Markdown im Format des "theater-scene-epub"-Skills:
 *
 *   # Szenentitel
 *   **SCROOGE:** Dialogtext ...
 *   *Er zeigt auf das Namensschild.*
 *   **HARTY & JOLLYGOODE:** Gleichzeitig gesprochener Text
 */

interface ItemBase {
  text: string
  /** Über Edits hinweg stabiler Schlüssel für den Lernfortschritt */
  key: string
  index: number
}

export interface DialogueItem extends ItemBase {
  kind: 'dialogue'
  /** Sprecherzeile wie im Markdown, z.B. "HARTY & JOLLYGOODE" */
  speaker: string
  /** Einzelne Rollen der Sprecherzeile, z.B. ["HARTY", "JOLLYGOODE"] */
  speakers: string[]
}

/** Kursiver Absatz: Regieanweisung / Handlung. */
export interface StageItem extends ItemBase {
  kind: 'stage'
}

/** Alles andere (Zwischenüberschriften, freie Absätze). */
export interface TextItem extends ItemBase {
  kind: 'text'
}

export type SceneItem = DialogueItem | StageItem | TextItem

type NewItem =
  | { kind: 'dialogue'; speaker: string; speakers: string[]; text: string }
  | { kind: 'stage'; text: string }
  | { kind: 'text'; text: string }

export interface ParsedScene {
  title: string | null
  items: SceneItem[]
  roles: Role[]
}

export interface Role {
  /** Vergleichsschlüssel (getrimmt, Großbuchstaben) */
  id: string
  /** Anzeigename wie im Text */
  name: string
  /** Anzahl Repliken, an denen die Rolle beteiligt ist */
  lineCount: number
  /** Anzahl Wörter, die die Rolle zu sprechen hat */
  wordCount: number
}

const SPEAKER_RE = /^\*\*\s*([^*]+?)\s*:?\s*\*\*\s*:?\s*([\s\S]*)$/
const STAGE_RE = /^(?:\*(?!\*)([\s\S]+?)\*|_([\s\S]+?)_)$/
const HEADING_RE = /^#{1,6}\s+(.*)$/

/** djb2-Hash, damit Fortschritt an den Textinhalt und nicht an die Zeilennummer hängt. */
function hash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function roleId(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** Zerlegt eine Sprecherzeile wie "HARTY & JOLLYGOODE" in einzelne Rollen. */
export function splitSpeakers(speaker: string): string[] {
  return speaker
    .split(/\s*(?:&|\+|\/|,| und )\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseScene(markdown: string): ParsedScene {
  const blocks = markdown
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  let title: string | null = null
  const items: SceneItem[] = []
  const seen = new Map<string, number>()

  const push = (item: NewItem, hashInput: string) => {
    const base = hash(hashInput)
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    items.push({ ...item, key: `${base}#${n}`, index: items.length })
  }

  for (const block of blocks) {
    // Weiche Zeilenumbrüche innerhalb eines Absatzes zusammenführen.
    const joined = block.replace(/\s*\n\s*/g, ' ').trim()

    const heading = joined.match(HEADING_RE)
    if (heading) {
      if (title === null) title = heading[1].trim()
      else push({ kind: 'text', text: heading[1].trim() }, `h|${heading[1]}`)
      continue
    }

    const speakerMatch = joined.match(SPEAKER_RE)
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim()
      const text = speakerMatch[2].trim()
      push(
        { kind: 'dialogue', speaker, speakers: splitSpeakers(speaker), text },
        `d|${roleId(speaker)}|${text}`,
      )
      continue
    }

    const stage = joined.match(STAGE_RE)
    if (stage) {
      const text = (stage[1] ?? stage[2]).trim()
      push({ kind: 'stage', text }, `s|${text}`)
      continue
    }

    // Absatz ohne eigenen Sprecher: gehört zur vorherigen Replik.
    const prev = items[items.length - 1]
    if (prev && prev.kind === 'dialogue') {
      prev.text = `${prev.text}\n\n${joined}`.trim()
      continue
    }
    push({ kind: 'text', text: joined }, `t|${joined}`)
  }

  return { title, items, roles: collectRoles(items) }
}

function collectRoles(items: SceneItem[]): Role[] {
  const roles = new Map<string, Role>()
  for (const item of items) {
    if (item.kind !== 'dialogue') continue
    const words = countWords(item.text)
    for (const name of item.speakers) {
      const id = roleId(name)
      const existing = roles.get(id)
      if (existing) {
        existing.lineCount += 1
        existing.wordCount += words
      } else {
        roles.set(id, { id, name: name.trim(), lineCount: 1, wordCount: words })
      }
    }
  }
  return [...roles.values()].sort((a, b) => b.lineCount - a.lineCount || a.name.localeCompare(b.name))
}

export function countWords(text: string): number {
  return stripMarkup(text).split(/\s+/).filter(Boolean).length
}

/** Entfernt Markdown-Auszeichnung für Wortzählung, Tipps und Vergleiche. */
export function stripMarkup(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
}

export function isOwnLine(item: SceneItem, role: string | null): boolean {
  if (!role || item.kind !== 'dialogue') return false
  return item.speakers.some((s) => roleId(s) === roleId(role))
}
