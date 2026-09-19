import { createClient } from "@supabase/supabase-js"

type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          room_id: string
          token: string
          created_at: string
        }
        Insert: {
          room_id: string
          token: string
          created_at?: string
        }
        Update: {
          room_id?: string
          token?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          room_id: string
          sender: string
          text: string
          timestamp: number
          token: string
          created_at: string
        }
        Insert: {
          id: string
          room_id: string
          sender: string
          text: string
          timestamp: number
          token: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender?: string
          text?: string
          timestamp?: number
          token?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_room: {
        Args: {
          p_room_id: string
          p_token: string
          p_max_users: number
        }
        Returns: "joined" | "exists" | "full" | "missing"
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  }

  supabaseClient ??= createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}
