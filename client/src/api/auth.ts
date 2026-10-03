import { api } from './client'

export interface User {
  id: string
  fullName: string
  username: string
  phone?: string
  email: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user: User
  accessToken?: string
}

export interface RegisterPayload {
  fullName: string
  username: string
  phone?: string
  email: string
  password: string
}

export interface LoginPayload {
  identifier: string
  password: string
}

export const registerApi = async (data: RegisterPayload): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data)
  return response.data
}

export const loginApi = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', data)
  return response.data
}

export const getMeApi = async (): Promise<{ success: boolean; user: User }> => {
  const response = await api.get<{ success: boolean; user: User }>('/auth/me')
  return response.data
}

export const logoutApi = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/auth/logout')
  return response.data
}
