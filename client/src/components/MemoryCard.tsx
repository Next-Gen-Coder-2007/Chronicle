import { Calendar, Trash2, Clock, CheckCircle2, Edit3 } from 'lucide-react'
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
  const dispatch = useAppDispatch()
  const isOngoing = memory.status === 'ongoing'

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {memory.title}
          </h3>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
              isOngoing
                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}
          >
            {isOngoing ? (
              <>
                <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                Ongoing
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Completed
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {memory.started}
              {memory.ended && memory.status === 'completed' ? ` → ${memory.ended}` : ''}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
          {memory.description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-1.5">
        <button
          onClick={() => dispatch(openEditModal(memory))}
          title="Edit memory"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(memory.id)}
            disabled={isDeleting}
            title="Delete memory"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  )
}
