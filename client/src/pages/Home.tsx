import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMeApi, logoutApi, type User } from '../api'
import { showToast } from '../utils/toast'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getMeApi()
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user)
        } else {
          navigate('/login')
        }
      })
      .catch(() => {
        navigate('/login')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [navigate])

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
    } finally {
      showToast('Logged out successfully', 'success', 5000)
      navigate('/login')
    }
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafd] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafd] text-slate-800 selection:bg-indigo-500 selection:text-white pb-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[460px] h-[460px] rounded-full bg-indigo-100/30 blur-3xl" />
        <div className="absolute -top-20 right-10 w-[500px] h-[500px] rounded-full bg-purple-100/25 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-96 h-96 rounded-full bg-sky-100/25 blur-3xl" />
      </div>

      <nav className="relative z-20 w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-md sticky top-0 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              C
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Chronicle<span className="text-indigo-600">.ai</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user.username.slice(0, 1)}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700">
                @{user.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-100"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-slate-100">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  @{user.username}
                </span>
                !
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                You are successfully logged in to Chronicle AI.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-extrabold shadow-lg shadow-indigo-500/25">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-8">
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-800">
                {user.fullName || '—'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Username
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-800">
                @{user.username}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-800 break-all">
                {user.email}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Phone Number
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-800">
                {user.phone || '—'}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              User ID: <span className="font-mono text-slate-500">{user.id}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              Sign out of account
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
