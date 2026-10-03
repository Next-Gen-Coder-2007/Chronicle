import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ArrowRight,
  Sparkles,
  FolderClock,
  CheckCircle,
  Clock,
  Heart,
  Tag,
  Inbox,
} from 'lucide-react'
import { useAppSelector, useAppDispatch, openCreateModal, deleteMemory } from '../store'
import MemoryCard from './MemoryCard'

export default function HomeView() {
  const user = useAppSelector((state) => state.auth.user)
  const { memories, isLoading } = useAppSelector((state) => state.memories)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [selectedTag, setSelectedTag] = useState<string>('all')

  if (!user) return null

  const totalCount = memories.length
  const ongoingCount = memories.filter((m) => m.status === 'ongoing').length
  const completedCount = memories.filter((m) => m.status === 'completed').length

  const firstName = user.fullName ? user.fullName.split(' ')[0] : user.username

  // Extract all unique tags across all memories
  const allTags = useMemo(() => {
    const set = new Set<string>()
    memories.forEach((m) => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach((t) => {
          if (t && typeof t === 'string' && t.trim()) {
            const clean = t.trim().replace(/^#+/, '')
            if (clean) set.add(clean)
          }
        })
      } else if (typeof m.tags === 'string' && m.tags.trim()) {
        m.tags
          .split(',')
          .map((t) => t.trim().replace(/^#+/, ''))
          .filter(Boolean)
          .forEach((t) => set.add(t))
      }
    })
    return Array.from(set)
  }, [memories])

  // Filter recent memories by selected tag
  const filteredRecentMemories = useMemo(() => {
    let list = memories
    if (selectedTag !== 'all') {
      list = list.filter((m) => {
        if (Array.isArray(m.tags)) {
          return m.tags.some(
            (t) =>
              String(t).trim().replace(/^#+/, '').toLowerCase() ===
              selectedTag.toLowerCase(),
          )
        }
        if (typeof m.tags === 'string') {
          return m.tags
            .toLowerCase()
            .split(',')
            .map((t) => t.trim().replace(/^#+/, ''))
            .includes(selectedTag.toLowerCase())
        }
        return false
      })
    }
    return list.slice(0, 4)
  }, [memories, selectedTag])

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      dispatch(deleteMemory(id))
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. SOLID VIBRANT HERO BANNER (NO GRADIENTS) */}
      <div className="relative overflow-hidden rounded-3xl bg-indigo-600 text-white p-6 sm:p-8 lg:p-10 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-indigo-500/50 border border-indigo-400/40 text-indigo-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chronicle Timeline</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Welcome back, {firstName}!
            </h2>

            <p className="mt-2.5 text-indigo-100 text-sm sm:text-base leading-relaxed max-w-xl">
              Log your projects, travels, hackathons, and moments. Add tags to organize and relive every achievement.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => dispatch(openCreateModal())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Memory</span>
              </button>

              <button
                onClick={() => navigate('/memories')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-semibold text-sm border border-indigo-500/50 transition-colors cursor-pointer"
              >
                <span>View all ({totalCount})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR DISTINCT COLOR-CODED STAT CARDS (SOLID COLORS, NO GRADIENTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stories - Solid Indigo */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <FolderClock className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Memories Recorded</p>
        </div>

        {/* Card 2: Ongoing Adventures - Solid Amber */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              In Progress
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{ongoingCount}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Ongoing Adventures</p>
        </div>

        {/* Card 3: Completed Milestones - Solid Emerald */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Completed
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Milestones Achieved</p>
        </div>

        {/* Card 4: Action Card - Solid Rose */}
        <div
          onClick={() => dispatch(openCreateModal())}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              New Memory
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
            Add a Chapter
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Capture a new milestone</p>
        </div>
      </div>

      {/* 3. TAG FILTER CHIPS (SOLID COLORS, NO GRADIENTS) */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Tags:</span>
          </span>

          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedTag === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({memories.length})
          </button>

          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 4. RECENT MEMORIES */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 rounded-full bg-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Memories</h3>
              <p className="text-xs text-slate-500">
                {selectedTag !== 'all' ? `Filtered by tag: "${selectedTag}"` : 'Your latest logged experiences'}
              </p>
            </div>
          </div>

          {memories.length > 0 && (
            <button
              onClick={() => navigate('/memories')}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              <span>View all ({totalCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-3 bg-slate-100 rounded-md w-full" />
                </div>
                <div className="h-4 bg-slate-100 rounded-md w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredRecentMemories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3.5">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              {selectedTag !== 'all' ? `No memories found with tag "${selectedTag}"` : 'No memories yet'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5">
              {selectedTag !== 'all'
                ? 'Try clearing the tag filter to see all your logged memories.'
                : 'Start by capturing your first memory—like a hackathon, a travel journey, or a project launch.'}
            </p>
            {selectedTag !== 'all' ? (
              <button
                onClick={() => setSelectedTag('all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear filter
              </button>
            ) : (
              <button
                onClick={() => dispatch(openCreateModal())}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Memory</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRecentMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
