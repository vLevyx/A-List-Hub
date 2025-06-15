export interface AuthUser {
  id: string
  email?: string
  user_metadata: {
    provider_id?: string
    sub?: string
    full_name?: string
    name?: string
    user_name?: string
    avatar_url?: string
  }
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: AuthUser
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  hasAccess: boolean
  isTrialActive: boolean
}