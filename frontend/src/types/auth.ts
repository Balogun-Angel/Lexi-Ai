export interface User {
  id: string
  full_name: string
  email: string
  created_at: string
}

export interface TokenResponse {
  user: User
  access_token: string
  token_type: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
}
