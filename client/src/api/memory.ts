import { api } from './client'

export interface Memory {
  id: string
  title: string
  description: string
  started: string
  ended?: string
  status: 'ongoing' | 'completed'
  location?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateMemoryPayload {
  title: string
  description: string
  started: string
  ended?: string
  status: 'ongoing' | 'completed'
  location?: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export const getMemoriesApi = async (recent?: boolean, limit?: number): Promise<ApiResponse<Memory[]>> => {
  const params: Record<string, string | number> = {}
  if (recent) params.recent = 'true'
  if (limit) params.limit = limit
  const response = await api.get<ApiResponse<Memory[]>>('/memories', { params })
  return response.data
}

export const getRecentMemoriesApi = async (limit: number = 5): Promise<ApiResponse<Memory[]>> => {
  const response = await api.get<ApiResponse<Memory[]>>('/memories/recent', { params: { limit } })
  return response.data
}

export interface UpdateMemoryPayload {
  title?: string
  description?: string
  started?: string
  ended?: string
  status?: 'ongoing' | 'completed'
}

export const createMemoryApi = async (data: CreateMemoryPayload): Promise<ApiResponse<Memory>> => {
  const response = await api.post<ApiResponse<Memory>>('/memories', data)
  return response.data
}

export const updateMemoryApi = async (id: string, data: UpdateMemoryPayload): Promise<ApiResponse<Memory>> => {
  const response = await api.patch<ApiResponse<Memory>>(`/memories/${id}`, data)
  return response.data
}

export const deleteMemoryApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/memories/${id}`)
  return response.data
}
