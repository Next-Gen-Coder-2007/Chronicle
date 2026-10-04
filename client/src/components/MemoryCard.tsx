import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Trash2, CheckCircle2, Edit3, Tag } from 'lucide-react'
import type { Memory } from '../api'
import { useAppDispatch, openEditModal } from '../store'

interface MemoryCardProps {
  memory: Memory
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

export default function MemoryCard({
  memory,
  onDelete,
  isDeleting = false,
}: MemoryCardProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isOngoing = memory.status === 'ongoing'

  // Parse user tags from memory
  const tagsList = useMemo(() => {
    if (!memory.tags) return []
    if (Array.isArray(memory.tags)) {
      return memory.tags
        .map((t) => String(t).trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    if (typeof memory.tags === 'string') {
      return memory.tags
        .split(',')
        .map((t) => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    return []
  }, [memory.tags])

  const coverImage = useMemo(() => {
    if (!memory.media || memory.media.length === 0) return null
    const images = memory.media.filter(
      (item) =>
        item.url &&
        (item.type?.startsWith('image/') ||
          item.url.startsWith('data:image') ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name || '')),
    )
    if (images.length === 0) return null
    const randomIndex = Math.floor(Math.random() * images.length)
    return images[randomIndex]
  }, [memory.media, memory.id])

  return (
    <div
      onClick={() => navigate(`/memories/${memory.id}`)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Cover Image (First image in media) */}
      {coverImage ? (
        <div className="relative w-full h-44 bg-slate-100 overflow-hidden shrink-0 border-b border-slate-100">
          <img
            src={coverImage.url}
            crossOrigin="use-credentials"
            alt={memory.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Status Pill floating on cover */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs ${
                isOngoing
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isOngoing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Ongoing</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Completed</span>
                </>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Title + Status Pill (when no cover image) */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {memory.title}
            </h3>

            {!coverImage && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                  isOngoing
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isOngoing ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Ongoing</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Completed</span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2.5">
            <div className="inline-flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">
                {memory.started}
                {memory.ended && memory.status === 'completed' ? ` → ${memory.ended}` : ''}
              </span>
            </div>
          </div>

          {/* Real User Tags */}
          {tagsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {tagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
            {memory.description}
          </p>
        </div>

        {/* Footer Actions (Clean, right-aligned) */}
        <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              dispatch(openEditModal(memory))
            }}
            title="Edit memory"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(memory.id)
              }}
              disabled={isDeleting}
              title="Delete memory"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
