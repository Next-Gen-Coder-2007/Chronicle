import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { useAppSelector, useAppDispatch, logoutUser } from '../store'
import { showToast } from '../utils/toast'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()

  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/memories')) return 'Memories'
    if (path.startsWith('/settings')) return 'Settings'
    return 'Home'
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    showToast('Logged out successfully', 'success', 5000)
    navigate('/login')
  }

  if (!user) return null

  return (
    <header className="h-16 w-full bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
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
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <h1 className="text-lg font-bold text-slate-900 capitalize tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline-block">
            @{user.username}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline-block">Sign out</span>
        </button>
      </div>
    </header>
  )
}
