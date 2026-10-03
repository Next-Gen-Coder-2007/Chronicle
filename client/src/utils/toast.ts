export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  text: string
  duration: number
}

type ToastListener = (toast: ToastMessage | null) => void

let activeListener: ToastListener | null = null
let currentTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(text: string, type: ToastType = 'error', duration = 5000) {
  if (currentTimer) {
    clearTimeout(currentTimer)
  }

  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random()}`,
    type,
    text,
    duration,
  }

  if (activeListener) {
    activeListener(toast)
  }

  currentTimer = setTimeout(() => {
    if (activeListener) {
      activeListener(null)
    }
    currentTimer = null
  }, duration)
}

export function hideToast() {
  if (currentTimer) {
    clearTimeout(currentTimer)
    currentTimer = null
  }
  if (activeListener) {
    activeListener(null)
  }
}

export function subscribeToast(listener: ToastListener) {
  activeListener = listener
  return () => {
    if (activeListener === listener) {
      activeListener = null
    }
  }
}
