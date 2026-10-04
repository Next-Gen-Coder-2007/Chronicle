import { api } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSourceCitation {
  id: string
  documentId: string
  documentName?: string
  fileId?: string
  filename?: string
  mimeType?: string
  memoryId?: string
  chunkIndex: number
  similarity: number
  relevanceScore?: number
  content: string
  page?: number
  pageNumber?: number
  startTime?: number
  startTimestamp?: number
  endTime?: number
  endTimestamp?: number
  contentType?: string
}

export interface ChatResponseData {
  answer: string
  sources: ChatSourceCitation[]
  memoryId?: string
  query: string
}

export interface SendChatMessagePayload {
  message: string
  memoryId?: string
  history?: ChatMessage[]
  limit?: number
  minSimilarity?: number
}

export async function sendChatMessageApi(
  payload: SendChatMessagePayload,
): Promise<ChatResponseData> {
  const res = await api.post<{ success: boolean; data: ChatResponseData }>(
    '/chat',
    payload,
  )
  return res.data.data
}
