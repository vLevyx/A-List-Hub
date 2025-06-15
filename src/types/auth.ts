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
    picture?: string
    email?: string
    preferred_username?: string
  }
  identities?: Array<{
    id: string
    provider: string
  }>
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  user: AuthUser
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  hasAccess: boolean
  isTrialActive: boolean
}

export interface AuthError {
  message: string
  status?: number
  name?: string
}

export interface AuthCache {
  data: AuthState
  timestamp: number
}