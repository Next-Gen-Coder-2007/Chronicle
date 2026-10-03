import { User, Mail, Phone, AtSign, ShieldCheck, Bell, Sparkles } from 'lucide-react'
import { useAppSelector } from '../store'

export default function Settings() {
  const user = useAppSelector((state) => state.auth.user)
  const memories = useAppSelector((state) => state.memories.memories)

  if (!user) return null

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Preferences</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal profile, credentials, and timeline experience.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-md">
              {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user.fullName || user.username}</h3>
              <p className="text-xs sm:text-sm text-slate-500">@{user.username}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Chronicle Account</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
              <span className="text-xs text-slate-500 block font-medium">Memories</span>
              <span className="text-lg font-bold text-indigo-600">{memories.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{user.fullName || '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
              <AtSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Username</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">@{user.username}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Phone Number</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{user.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Member since {formattedDate}</span>
          <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Active Session
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Preferences</h3>
        
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Email Notifications</h4>
              <p className="text-xs text-slate-500">Receive milestone and activity updates</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Enabled
          </span>
        </div>
      </div>
    </div>
  )
}
