// lib/db/memory.ts
import { createServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase'
import type { UserMemory } from '@/lib/supabase'

export async function getMemoriesForUser(userId: string): Promise<UserMemory[]> {
  if (!isSupabaseServiceConfigured()) {
    return []
  }
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertMemory(
  userId: string,
  key: string,
  value: string,
  category = 'general'
): Promise<UserMemory> {
  if (!isSupabaseServiceConfigured()) {
    throw new Error('Supabase not configured')
  }
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_memories')
    .upsert(
      { user_id: userId, key, value, category, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  if (!isSupabaseServiceConfigured()) {
    throw new Error('Supabase not configured')
  }
  const db = createServiceClient()
  const { error } = await db
    .from('user_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Search memories by keyword — case-insensitive substring match across key, value, and category.
 * Used by the searchMemory tool to resolve contact names like "Johnson" to stored contact facts.
 */
export async function searchMemoriesForUser(
  userId: string,
  query: string
): Promise<UserMemory[]> {
  if (!isSupabaseServiceConfigured()) {
    return []
  }
  const db = createServiceClient()
  const q = query.toLowerCase()
  const { data, error } = await db
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  const all = data ?? []
  return all.filter(
    (m) =>
      m.key.toLowerCase().includes(q) ||
      m.value.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
  )
}

/** Format memories for injection into the system prompt, grouping contacts for better entity resolution */
export function formatMemoriesForPrompt(memories: UserMemory[]): string {
  if (memories.length === 0) return ''

  const contacts = memories.filter((m) => m.category === 'contact')
  const rest = memories.filter((m) => m.category !== 'contact')

  const sections: string[] = []

  if (contacts.length > 0) {
    const contactLines = contacts.map((m) => `- ${m.key}: ${m.value}`)
    sections.push(`## Contacts & People (use these for entity resolution — e.g. "send email to Alice" → look up alice_email here):\n${contactLines.join('\n')}`)
  }

  if (rest.length > 0) {
    const otherLines = rest.map((m) => `- [${m.category}] ${m.key}: ${m.value}`)
    sections.push(`## Other Persistent Facts About This User:\n${otherLines.join('\n')}`)
  }

  return `\n\n${sections.join('\n\n')}\n\nUse this context naturally. For any action involving a person by name (e.g. "email Johnson", "call Sarah"), check the Contacts section above first. Do not mention the memory system unless the user asks.`
}
