import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeToast, hideToast, type ToastMessage } from '../utils/toast'

export default function StatusToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToast(newToast)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200/80 text-emerald-900 shadow-emerald-500/10'
                : 'bg-rose-50/95 border-rose-200/80 text-rose-900 shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {toast.type === 'success' ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>

              <div className="text-xs sm:text-sm font-semibold leading-snug break-words">
                {toast.text}
              </div>
            </div>

            <button
              onClick={hideToast}
              className={`p-1 rounded-lg transition-colors cursor-pointer flex-shrink-0 ${
                toast.type === 'success'
                  ? 'hover:bg-emerald-200/60 text-emerald-700'
                  : 'hover:bg-rose-200/60 text-rose-700'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
