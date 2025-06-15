export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string | null
          username: string | null
          created_at: string
          revoked: boolean | null
          discord_id: string
          last_login: string | null
          login_count: number | null
          hub_trial: boolean | null
          trial_expiration: string | null
        }
        Insert: {
          id?: string | null
          username?: string | null
          created_at?: string
          revoked?: boolean | null
          discord_id: string
          last_login?: string | null
          login_count?: number | null
          hub_trial?: boolean | null
          trial_expiration?: string | null
        }
        Update: {
          id?: string | null
          username?: string | null
          created_at?: string
          revoked?: boolean | null
          discord_id?: string
          last_login?: string | null
          login_count?: number | null
          hub_trial?: boolean | null
          trial_expiration?: string | null
        }
      }
      user_blueprints: {
        Row: {
          id: string
          discord_id: string | null
          blueprint_name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          discord_id?: string | null
          blueprint_name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          discord_id?: string | null
          blueprint_name?: string
          created_at?: string | null
        }
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string | null
          admin_name: string | null
          action: string | null
          target_discord_id: string | null
          created_at: string | null
          description: string | null
        }
        Insert: {
          id?: string
          admin_id?: string | null
          admin_name?: string | null
          action?: string | null
          target_discord_id?: string | null
          created_at?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          admin_id?: string | null
          admin_name?: string | null
          action?: string | null
          target_discord_id?: string | null
          created_at?: string | null
          description?: string | null
        }
      }
      page_sessions: {
        Row: {
          id: string
          discord_id: string
          username: string | null
          page_path: string
          enter_time: string | null
          exit_time: string | null
          time_spent_seconds: number | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          discord_id: string
          username?: string | null
          page_path: string
          enter_time?: string | null
          exit_time?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          discord_id?: string
          username?: string | null
          page_path?: string
          enter_time?: string | null
          exit_time?: string | null
          is_active?: boolean | null
        }
      }
    }
    Functions: {
      upsert_user_login: {
        Args: {
          target_discord_id: string
          user_name?: string
        }
        Returns: Json
      }
      start_trial: {
        Args: {
          discord_id_input: string
        }
        Returns: void
      }
      get_profile_and_blueprints: {
        Args: {
          user_discord_id: string
        }
        Returns: Json
      }
      revoke_expired_trials: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type UserBlueprint = Database['public']['Tables']['user_blueprints']['Row']
export type AdminLog = Database['public']['Tables']['admin_logs']['Row']
export type PageSession = Database['public']['Tables']['page_sessions']['Row']

export interface UserWithAccess extends User {
  hasAccess: boolean
  isTrialActive: boolean
}