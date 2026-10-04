import { api } from './client'

export interface MemoryMedia {
  id: string
  name: string
  url?: string
  type: string
  size?: number
  content?: string
  uploadedAt: string
}

export interface Memory {
  id: string
  title: string
  description: string
  started: string
  ended?: string
  status: 'ongoing' | 'completed'
  location?: string
  tags?: string[] | string
  media?: MemoryMedia[]
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
  tags?: string[]
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

export const getMemoryByIdApi = async (id: string): Promise<ApiResponse<Memory>> => {
  const response = await api.get<ApiResponse<Memory>>(`/memories/${id}`)
  return response.data
}

export interface UpdateMemoryPayload {
  title?: string
  description?: string
  started?: string
  ended?: string
  status?: 'ongoing' | 'completed'
  location?: string
  tags?: string[]
  media?: MemoryMedia[]
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

export const uploadMemoryMediaApi = async (
  id: string,
  data: { name: string; url?: string; type: string; size?: number; content?: string },
): Promise<ApiResponse<Memory>> => {
  const response = await api.post<ApiResponse<Memory>>(`/memories/${id}/media`, data)
  return response.data
}

export const deleteMemoryMediaApi = async (
  id: string,
  mediaId: string,
): Promise<ApiResponse<Memory>> => {
  const response = await api.delete<ApiResponse<Memory>>(`/memories/${id}/media/${mediaId}`)
  return response.data
}

export const updateMemoryMediaApi = async (
  id: string,
  mediaId: string,
  data: { name?: string; content?: string },
): Promise<ApiResponse<Memory>> => {
  const response = await api.patch<ApiResponse<Memory>>(`/memories/${id}/media/${mediaId}`, data)
  return response.data
}
