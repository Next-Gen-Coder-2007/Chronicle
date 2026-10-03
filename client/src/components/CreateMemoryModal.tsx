import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  CalendarDays,
  FileText,
  Tag,
  Edit3,
} from 'lucide-react'
import {
  useAppSelector,
  useAppDispatch,
  closeCreateModal,
  createMemory,
  updateMemory,
} from '../store'
import type { Memory } from '../api'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

const toInputDate = (dateStr?: string) => {
  if (!dateStr || !dateStr.trim()) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const str = dateStr.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const monthKey = dmyMatch[2].slice(0, 3).toLowerCase()
    const month = MONTH_MAP[monthKey]
    const year = dmyMatch[3]
    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  if (str.includes('T')) {
    const datePart = str.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart
    }
  }

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDateString = (dateVal: string) => {
  if (!dateVal) return ''
  const str = dateVal.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-')
    const monthIdx = parseInt(month, 10) - 1
    const dayNum = parseInt(day, 10)
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${MONTH_NAMES[monthIdx]} ${year}`
    }
  }
  return str
}

function MemoryModalDialog({
  editingMemory,
  onClose,
}: {
  editingMemory: Memory | null
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const isEditMode = Boolean(editingMemory)

  const [title, setTitle] = useState(() => editingMemory?.title || '')
  const [description, setDescription] = useState(() => editingMemory?.description || '')
  const [started, setStarted] = useState(() => toInputDate(editingMemory?.started))
  const [ended, setEnded] = useState(() => toInputDate(editingMemory?.ended))
  const [status, setStatus] = useState<'ongoing' | 'completed'>(
    () => editingMemory?.status || 'completed',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (!title.trim()) {
      errs.title = 'Title is required'
    }
    if (!description.trim()) {
      errs.description = 'Description is required'
    }
    if (!started.trim()) {
      errs.started = 'Start date is required'
    }
    if (status === 'completed' && !ended.trim()) {
      errs.ended = 'End date is required for completed memories'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const formattedStarted = formatDateString(started)
      const formattedEnded = status === 'completed' ? formatDateString(ended) : undefined

      if (isEditMode && editingMemory) {
        const result = await dispatch(
          updateMemory({
            id: editingMemory.id,
            payload: {
              title: title.trim(),
              description: description.trim(),
              started: formattedStarted,
              ended: formattedEnded,
              status,
            },
          }),
        )

        if (updateMemory.fulfilled.match(result)) {
          onClose()
        }
      } else {
        const result = await dispatch(
          createMemory({
            title: title.trim(),
            description: description.trim(),
            started: formattedStarted,
            ended: formattedEnded,
            status,
          }),
        )

        if (createMemory.fulfilled.match(result)) {
          onClose()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      data-lenis-prevent
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-6 sm:p-8 z-10 my-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              {isEditMode ? (
                <Edit3 className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Sparkles className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isEditMode ? 'Edit Memory' : 'Create a Memory'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isEditMode
                  ? 'Update your recorded achievement, event, or journey.'
                  : 'Record an unforgettable achievement, event, or journey.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Title</span>
              </label>
              {errors.title && (
                <span className="text-xs text-rose-500 font-semibold">{errors.title}</span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }))
              }}
              placeholder="My First Hackathon"
              className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 text-sm placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                errors.title
                  ? 'border-rose-300 ring-4 ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Description</span>
              </label>
              <div className="flex items-center gap-2">
                {errors.description && (
                  <span className="text-xs text-rose-500 font-semibold">{errors.description}</span>
                )}
                <span className="text-[11px] text-slate-400 font-medium">
                  {description.length} chars
                </span>
              </div>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
              }}
              placeholder="Tell us a little about this memory..."
              className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 text-sm placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none resize-none ${
                errors.description
                  ? 'border-rose-300 ring-4 ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('ongoing')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  status === 'ongoing'
                    ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    status === 'ongoing'
                      ? 'border-amber-600 bg-amber-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {status === 'ongoing' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold ${
                        status === 'ongoing' ? 'text-amber-900' : 'text-slate-800'
                      }`}
                    >
                      Ongoing
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Currently active / in progress</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    status === 'completed'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {status === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold ${
                        status === 'completed' ? 'text-indigo-900' : 'text-slate-800'
                      }`}
                    >
                      Completed
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Accomplished & finalized</p>
                </div>
              </button>
            </div>
          </div>

          <div
            className={`grid gap-4 transition-all duration-200 ${
              status === 'completed' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Started</span>
                </label>
                {errors.started && (
                  <span className="text-xs text-rose-500 font-semibold">{errors.started}</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={started}
                  onChange={(e) => {
                    setStarted(e.target.value)
                    if (errors.started) setErrors((prev) => ({ ...prev, started: '' }))
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 text-sm bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                    errors.started
                      ? 'border-rose-300 ring-4 ring-rose-500/10'
                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Date when this memory began</p>
            </div>

            {status === 'completed' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                    <span>End Date</span>
                  </label>
                  {errors.ended && (
                    <span className="text-xs text-rose-500 font-semibold">{errors.ended}</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={ended}
                    onChange={(e) => {
                      setEnded(e.target.value)
                      if (errors.ended) setErrors((prev) => ({ ...prev, ended: '' }))
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 text-sm bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                      errors.ended
                        ? 'border-rose-300 ring-4 ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Date when this was completed</p>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditMode ? 'Saving Changes...' : 'Creating Memory...'}</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Memory'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CreateMemoryModal() {
  const isOpen = useAppSelector((state) => state.memories.isCreateModalOpen)
  const editingMemory = useAppSelector((state) => state.memories.editingMemory)
  const dispatch = useAppDispatch()

  const handleClose = useCallback(() => {
    dispatch(closeCreateModal())
  }, [dispatch])

  useEffect(() => {
    if (!isOpen) return

    const lenis = (window as any).__lenis
    if (lenis) {
      lenis.stop()
    }

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    document.documentElement.classList.add('modal-open')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
      if (lenis) {
        lenis.start()
      }
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <MemoryModalDialog
      key={editingMemory?.id || 'create-memory-dialog'}
      editingMemory={editingMemory}
      onClose={handleClose}
    />
  )
}
