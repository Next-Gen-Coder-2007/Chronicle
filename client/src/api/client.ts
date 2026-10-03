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
    const responseData = error.response?.data
    let message = responseData?.message || responseData?.error || error.message || 'An unexpected error occurred'

    if (Array.isArray(message)) {
      message = message.join(', ')
    }

    if (error.config?.url !== '/auth/me') {
      showToast(message, 'error', 5000)
    }

    return Promise.reject(error)
  },
)
