import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight, Sparkles, FolderClock, CheckCircle, Clock } from 'lucide-react'
import { useAppSelector, useAppDispatch, openCreateModal, deleteMemory } from '../store'
import MemoryCard from './MemoryCard'

export default function HomeView() {
  const user = useAppSelector((state) => state.auth.user)
  const { memories, isLoading } = useAppSelector((state) => state.memories)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  if (!user) return null

  const recentMemories = memories.slice(0, 4)
  const totalCount = memories.length
  const ongoingCount = memories.filter((m) => m.status === 'ongoing').length
  const completedCount = memories.filter((m) => m.status === 'completed').length

  const firstName = user.fullName ? user.fullName.split(' ')[0] : user.username

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      dispatch(deleteMemory(id))
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {firstName}!
            </h2>
            <p className="mt-2 text-indigo-100/80 text-sm sm:text-base leading-relaxed">
              Capture your milestones, hackathons, and moments in Chronicle. What memory are you crafting today?
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => dispatch(openCreateModal())}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Memory</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FolderClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Memories</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ongoing</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{ongoingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{completedCount}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Memories</h3>
            <p className="text-xs sm:text-sm text-slate-500">Your latest logged experiences and milestones</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(openCreateModal())}
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
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
        ) : recentMemories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3.5">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No memories yet</h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5">
              Start by capturing your first memory—like a hackathon, a travel journey, or a project launch.
            </p>
            <button
              onClick={() => dispatch(openCreateModal())}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Memory</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentMemories.map((memory) => (
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
