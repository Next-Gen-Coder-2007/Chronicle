import axios, { type AxiosError } from 'axios'
import { showToast } from '../utils/toast'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
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

    if (status === 401) {
      if (url !== '/auth/me' && url !== '/auth/login' && url !== '/auth/register') {
        showToast('Session expired. You have been logged out.', 'error', 5000)
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
      } else if (url === '/auth/login' || url === '/auth/register') {
        showToast(message, 'error', 5000)
      }
    } else {
      if (url !== '/auth/me') {
        showToast(message, 'error', 5000)
      }
    }

    return Promise.reject(error)
  },
)
