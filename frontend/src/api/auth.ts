import type { LoginPayload, RegisterPayload, TokenResponse, User } from '../types/auth'
import { apiRequest } from './client'

export function register(payload: RegisterPayload): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  })
}

export function login(payload: LoginPayload): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  })
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me')
}
