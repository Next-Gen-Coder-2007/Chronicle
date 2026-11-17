import axios, { type AxiosError } from 'axios'
import { showToast } from '../utils/toast'

// Support Vercel internal service binding (if executed in a serverless function runtime),
// VITE_API_BASE_URL env var, or default to '/api' for same-origin routing in Vercel.
const runtimeProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined
const serverBindingUrl = runtimeProcess?.env?.SERVER_URL
  ? `${runtimeProcess.env.SERVER_URL.replace(/\/+$/, '')}/api`
  : undefined

export const api = axios.create({
  baseURL: serverBindingUrl || import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const status = error.response?.status
    const url = error.config?.url
    const responseData = error.response?.data
    let message =
      responseData?.message || responseData?.error || error.message || 'An unexpected error occurred'

    if (Array.isArray(message)) {
      message = message.join(', ')
    }

    const isAuthMe = Boolean(url && url.endsWith('/auth/me'))
    const isAuthLogin = Boolean(url && url.endsWith('/auth/login'))
    const isAuthRegister = Boolean(url && url.endsWith('/auth/register'))

    if (status === 401) {
      if (!isAuthMe && !isAuthLogin && !isAuthRegister) {
        showToast('Session expired. You have been logged out.', 'error', 5000)
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
      } else if (isAuthLogin || isAuthRegister) {
        showToast(message, 'error', 5000)
      }
    } else {
      if (!isAuthMe) {
        showToast(message, 'error', 5000)
      }
    }

    return Promise.reject(error)
  },
)

export async function fetchFileBlob(
  memoryId: string,
  fileId: string,
): Promise<{ blob: Blob; url: string; mimeType: string }> {
  const response = await api.get(`/memories/${memoryId}/files/${fileId}`, {
    responseType: 'blob',
  })
  const blob = response.data
  const mimeType = (response.headers['content-type'] as string) || blob.type || 'application/octet-stream'
  const url = URL.createObjectURL(blob)
  return { blob, url, mimeType }
}

