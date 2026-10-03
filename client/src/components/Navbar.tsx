import { Menu, LogOut } from 'lucide-react'
import type { User } from '../api'

interface NavbarProps {
  user: User
  onLogout: () => void
  onToggleSidebar?: () => void
  title?: string
}

export default function Navbar({
  user,
  onLogout,
  onToggleSidebar,
  title = 'Home',
}: NavbarProps) {
  return (
    <header className="h-16 w-full bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-slate-900 capitalize">
          {title}
        </h1>
      </div>

      {/* Right: User Info & Sign Out */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
            {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">
            @{user.username}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline-block">Sign out</span>
        </button>
      </div>
    </header>
  )
}
