import { supabase } from '../lib/supabase'
import type { LineStat } from '../lib/difficulty'

interface StatRow {
  line_key: string
  seen: number
  known: number
  forgotten: number
  streak: number
  last_result: 'known' | 'forgot' | null
  last_reviewed_at: string | null
}

function toStat(row: StatRow): LineStat {
  return {
    lineKey: row.line_key,
    seen: row.seen,
    known: row.known,
    forgotten: row.forgotten,
    streak: row.streak,
    lastResult: row.last_result,
    lastReviewedAt: row.last_reviewed_at,
  }
}

/** Alle Statistiken einer Rolle in einer Szene, nach line_key indiziert. */
export async function loadStats(sceneId: string, roleId: string): Promise<Map<string, LineStat>> {
  const { data, error } = await supabase
    .from('line_stats')
    .select('line_key, seen, known, forgotten, streak, last_result, last_reviewed_at')
    .eq('scene_id', sceneId)
    .eq('role_id', roleId)
  if (error) throw error
  return new Map((data ?? []).map((row) => [row.line_key, toStat(row as StatRow)]))
}

/** Statistiken aller Rollen einer Szene, gruppiert nach role_id. */
export async function loadSceneStats(sceneId: string): Promise<Map<string, Map<string, LineStat>>> {
  const { data, error } = await supabase
    .from('line_stats')
    .select('role_id, line_key, seen, known, forgotten, streak, last_result, last_reviewed_at')
    .eq('scene_id', sceneId)
  if (error) throw error
  const byRole = new Map<string, Map<string, LineStat>>()
  for (const row of (data ?? []) as (StatRow & { role_id: string })[]) {
    const bucket = byRole.get(row.role_id) ?? new Map<string, LineStat>()
    bucket.set(row.line_key, toStat(row))
    byRole.set(row.role_id, bucket)
  }
  return byRole
}

export async function recordResult(
  sceneId: string,
  roleId: string,
  lineKey: string,
  known: boolean,
): Promise<LineStat> {
  const { data, error } = await supabase.rpc('record_line_result', {
    p_scene_id: sceneId,
    p_role_id: roleId,
    p_line_key: lineKey,
    p_known: known,
  })
  if (error) throw error
  return toStat(data as StatRow)
}

export async function resetProgress(sceneId: string, roleId: string) {
  const { error } = await supabase
    .from('line_stats')
    .delete()
    .eq('scene_id', sceneId)
    .eq('role_id', roleId)
  if (error) throw error
}

/** Zuletzt geübte Position, damit man dort weitermachen kann. */
export async function loadCursor(sceneId: string, roleId: string): Promise<number> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('cursor')
    .eq('scene_id', sceneId)
    .eq('role_id', roleId)
    .maybeSingle()
  if (error) throw error
  return data?.cursor ?? 0
}

export async function saveCursor(sceneId: string, roleId: string, cursor: number) {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const { error } = await supabase.from('study_sessions').upsert(
    {
      user_id: userId,
      scene_id: sceneId,
      role_id: roleId,
      cursor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,scene_id,role_id' },
  )
  if (error) throw error
}
