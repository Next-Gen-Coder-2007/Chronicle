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
  const [tags, setTags] = useState<string[]>(() => {
    if (!editingMemory?.tags) return []
    if (Array.isArray(editingMemory.tags)) {
      return editingMemory.tags
        .map((t) => String(t).trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    if (typeof editingMemory.tags === 'string') {
      return editingMemory.tags
        .split(',')
        .map((t) => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    return []
  })
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const addTag = (text: string) => {
    const clean = text.trim().replace(/^#+/, '')
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean])
    }
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx))
  }

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

    // If there is any uncommitted text in tagInput, add it
    let currentTags = tags
    if (tagInput.trim()) {
      const clean = tagInput.trim().replace(/^#+/, '')
      if (clean && !currentTags.includes(clean)) {
        currentTags = [...currentTags, clean]
        setTags(currentTags)
      }
      setTagInput('')
    }

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
              tags: currentTags,
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
            tags: currentTags,
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
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 sm:p-6 z-10 my-auto flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              {isEditMode ? (
                <Edit3 className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {isEditMode ? 'Edit Memory' : 'Create Memory'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? 'Update your recorded milestone.'
                  : 'Record a milestone or memorable story.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3.5" data-lenis-prevent>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
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
                placeholder="e.g. My First Hackathon"
                className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 text-sm placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                  errors.title
                    ? 'border-rose-300 ring-2 ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Description</span>
                </label>
                <div className="flex items-center gap-2">
                  {errors.description && (
                    <span className="text-xs text-rose-500 font-semibold">{errors.description}</span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {description.length} chars
                  </span>
                </div>
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
                }}
                placeholder="Tell us a little about this memory..."
                className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 text-sm placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none resize-none ${
                  errors.description
                    ? 'border-rose-300 ring-2 ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tags</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Press Enter or comma to add
                </span>
              </div>

              <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all flex flex-wrap items-center gap-1.5 min-h-[38px]">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="text-indigo-400 hover:text-indigo-700 p-0.5 rounded cursor-pointer transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput)
                  }}
                  placeholder={tags.length === 0 ? "Add tags (e.g. hackathon, travel)..." : "Add more..."}
                  className="flex-1 min-w-[110px] text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none px-1 py-0.5"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick add:</span>
                {['Hackathon', 'Travel', 'Milestone', 'Project', 'Friends'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => addTag(sug)}
                    className="text-[10px] font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Status
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('ongoing')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'ongoing'
                      ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/60 text-slate-600'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      status === 'ongoing'
                        ? 'border-amber-600 bg-amber-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {status === 'ongoing' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold ${
                          status === 'ongoing' ? 'text-amber-900' : 'text-slate-800'
                        }`}
                      >
                        Ongoing
                      </span>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">In progress</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'completed'
                      ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/60 text-slate-600'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      status === 'completed'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {status === 'completed' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold ${
                          status === 'completed' ? 'text-indigo-900' : 'text-slate-800'
                        }`}
                      >
                        Completed
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">Accomplished</p>
                  </div>
                </button>
              </div>
            </div>

            <div
              className={`grid gap-3 transition-all duration-200 ${
                status === 'completed' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Started</span>
                  </label>
                  {errors.started && (
                    <span className="text-xs text-rose-500 font-semibold">{errors.started}</span>
                  )}
                </div>
                <input
                  type="date"
                  value={started}
                  onChange={(e) => {
                    setStarted(e.target.value)
                    if (errors.started) setErrors((prev) => ({ ...prev, started: '' }))
                  }}
                  className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                    errors.started
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                  }`}
                />
              </div>

              {status === 'completed' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                      <span>End Date</span>
                    </label>
                    {errors.ended && (
                      <span className="text-xs text-rose-500 font-semibold">{errors.ended}</span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={ended}
                    onChange={(e) => {
                      setEnded(e.target.value)
                      if (errors.ended) setErrors((prev) => ({ ...prev, ended: '' }))
                    }}
                    className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs bg-slate-50/50 hover:bg-white focus:bg-white transition-all outline-none ${
                      errors.ended
                        ? 'border-rose-300 ring-2 ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
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
