import { parseScene, type DialogueItem, type SceneItem } from './parser'

export interface SceneDiff {
  /** Repliken, deren Schlüssel die Änderung überlebt – Fortschritt bleibt. */
  kept: DialogueItem[]
  /** Neue oder geänderte Repliken – sie starten ohne Fortschritt. */
  changed: DialogueItem[]
  /** Repliken, die es nicht mehr gibt – ihr Fortschritt wird gelöscht. */
  removed: DialogueItem[]
}

function dialogues(markdown: string): DialogueItem[] {
  return parseScene(markdown).items.filter(isDialogue)
}

function isDialogue(item: SceneItem): item is DialogueItem {
  return item.kind === 'dialogue'
}

/**
 * Vergleicht zwei Fassungen einer Szene anhand der Fortschritts-Schlüssel.
 * Unveränderter Text behält seinen Schlüssel und damit seinen Lernstand,
 * geänderter Text bekommt einen neuen.
 */
export function diffScenes(oldMarkdown: string, newMarkdown: string): SceneDiff {
  const before = dialogues(oldMarkdown)
  const after = dialogues(newMarkdown)
  const beforeKeys = new Set(before.map((item) => item.key))
  const afterKeys = new Set(after.map((item) => item.key))

  return {
    kept: after.filter((item) => beforeKeys.has(item.key)),
    changed: after.filter((item) => !beforeKeys.has(item.key)),
    removed: before.filter((item) => !afterKeys.has(item.key)),
  }
}

/** Alle Schlüssel der neuen Fassung – alles andere ist verwaister Fortschritt. */
export function validKeys(markdown: string): Set<string> {
  return new Set(parseScene(markdown).items.map((item) => item.key))
}
