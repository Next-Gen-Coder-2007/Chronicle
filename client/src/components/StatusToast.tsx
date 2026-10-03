import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
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
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full max-w-md px-4">
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
                ? 'bg-emerald-50/95 border-emerald-200/90 text-emerald-900 shadow-emerald-500/10'
                : toast.type === 'info'
                ? 'bg-indigo-50/95 border-indigo-200/90 text-indigo-900 shadow-indigo-500/10'
                : 'bg-rose-50/95 border-rose-200/90 text-rose-900 shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : toast.type === 'info'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-rose-600 text-white shadow-xs'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                ) : toast.type === 'info' ? (
                  <Info className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                )}
              </div>

              <div className="text-xs sm:text-sm font-semibold leading-snug break-words">
                {toast.text}
              </div>
            </div>

            <button
              onClick={hideToast}
              className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                toast.type === 'success'
                  ? 'hover:bg-emerald-200/60 text-emerald-700'
                  : toast.type === 'info'
                  ? 'hover:bg-indigo-200/60 text-indigo-700'
                  : 'hover:bg-rose-200/60 text-rose-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
