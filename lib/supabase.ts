import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

/** Returns true only when real (non-placeholder) Supabase credentials are present */
export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return (
    url.startsWith('https://') &&
    !url.includes('your_supabase') &&
    key.length > 20 &&
    !key.includes('your_supabase')
  )
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Client for browser usage with anon key
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key (for API routes)
// Uses a short connect timeout so DB failures fail fast instead of blocking for 10 s
export function createServiceClient(timeoutMs = 4000) {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  if (!isSupabaseServiceConfigured()) {
    throw new Error('Supabase service client is not configured')
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: (url, options) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) }),
    },
  })
}

// Helper types for convenience
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row']
export type DocumentChunkInsert = Database['public']['Tables']['document_chunks']['Insert']

// Match documents function return type
export type MatchedDocument = Database['public']['Functions']['match_documents']['Returns'][number]

// Chat & memory types
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type UserMemory = Database['public']['Tables']['user_memories']['Row']
export type UserMemoryInsert = Database['public']['Tables']['user_memories']['Insert']
