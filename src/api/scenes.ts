import { supabase } from '../lib/supabase'
import { parseScene } from '../lib/parser'

export interface Scene {
  id: string
  title: string
  markdown: string
  created_at: string
  updated_at: string
}

export async function listScenes(): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('id, title, markdown, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getScene(id: string): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .select('id, title, markdown, created_at, updated_at')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createScene(markdown: string, titleOverride?: string): Promise<Scene> {
  const parsed = parseScene(markdown)
  const title = (titleOverride?.trim() || parsed.title || 'Unbenannte Szene').slice(0, 200)
  const { data, error } = await supabase
    .from('scenes')
    .insert({ title, markdown })
    .select('id, title, markdown, created_at, updated_at')
    .single()
  if (error) throw error
  return data
}

export async function updateScene(id: string, patch: Partial<Pick<Scene, 'title' | 'markdown'>>) {
  const { error } = await supabase.from('scenes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteScene(id: string) {
  const { error } = await supabase.from('scenes').delete().eq('id', id)
  if (error) throw error
}
