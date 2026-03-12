// lib/db/messages.ts
import { createServiceClient, isSupabaseServiceConfigured } from '@/lib/supabase'
import type { MyUIMessage } from '@/types/chat'
import type { ChatMessage } from '@/lib/supabase'

export async function saveMessages(
  sessionId: string,
  userId: string,
  messages: MyUIMessage[]
): Promise<void> {
  if (!isSupabaseServiceConfigured()) return
  const db = createServiceClient()
  const rows = messages.map((msg) => ({
    id: msg.id,
    session_id: sessionId,
    user_id: userId,
    role: msg.role,
    parts: stripLargeData(msg.parts ?? []),
    metadata: msg.metadata ?? null,
  }))
  const { error } = await db
    .from('chat_messages')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false })
  if (error) throw error
}

export async function getMessagesForSession(
  sessionId: string,
  userId: string
): Promise<MyUIMessage[]> {
  if (!isSupabaseServiceConfigured()) return []
  const db = createServiceClient()
  const { data, error } = await db
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: ChatMessage) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    parts: row.parts as MyUIMessage['parts'],
    metadata: row.metadata as MyUIMessage['metadata'],
  }))
}

function stripLargeData(parts: any[]): any[] {
  return parts.map((part) => {
    if (part.type === 'file' && typeof part.url === 'string') {
      if (part.url.startsWith('data:') && part.url.length > 50_000) {
        return { type: 'text', text: `[${part.mediaType ?? 'File'} attachment – ${part.name ?? 'file'}]` }
      }
    }
    return part
  })
}
