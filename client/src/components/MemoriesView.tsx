import { useState, useMemo } from 'react'
import { Plus, Search, Sparkles, Inbox } from 'lucide-react'
import { useAppSelector, useAppDispatch, openCreateModal, deleteMemory } from '../store'
import MemoryCard from './MemoryCard'

type FilterStatus = 'all' | 'ongoing' | 'completed'

export default function MemoriesView() {
  const { memories, isLoading } = useAppSelector((state) => state.memories)
  const dispatch = useAppDispatch()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const ongoingCount = useMemo(
    () => memories.filter((m) => m.status === 'ongoing').length,
    [memories],
  )
  const completedCount = useMemo(
    () => memories.filter((m) => m.status === 'completed').length,
    [memories],
  )

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (filterStatus !== 'all' && m.status !== filterStatus) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesTitle = m.title.toLowerCase().includes(query)
        const matchesDesc = m.description.toLowerCase().includes(query)
        const matchesTags = Array.isArray(m.tags)
          ? m.tags.some((t) => String(t).toLowerCase().includes(query))
          : typeof m.tags === 'string'
            ? m.tags.toLowerCase().includes(query)
            : false
        return matchesTitle || matchesDesc || matchesTags
      }
      return true
    })
  }, [memories, filterStatus, searchQuery])

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      dispatch(deleteMemory(id))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              All Memories
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {memories.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Browse, search, and relive every moment you have chronicled.
          </p>
        </div>

        <button
          onClick={() => dispatch(openCreateModal())}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Memory</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by title, description, or tags..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setFilterStatus('ongoing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'ongoing'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ongoing ({ongoingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'completed'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                <div className="h-3 bg-slate-100 rounded-md w-full" />
              </div>
              <div className="h-4 bg-slate-100 rounded-md w-1/3" />
            </div>
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Your memory chronicle is empty</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            Record memorable moments, experiences, and events in your journey.
          </p>
          <button
            onClick={() => dispatch(openCreateModal())}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Memory</span>
          </button>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching memories</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-4">
            No memories match your search query &ldquo;{searchQuery}&rdquo; under the &ldquo;{filterStatus}&rdquo; filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setFilterStatus('all')
            }}
            className="px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-indigo-200"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
