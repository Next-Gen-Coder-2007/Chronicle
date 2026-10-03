import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Image, Settings, LogOut } from 'lucide-react'
import { useAppSelector, useAppDispatch, logoutUser } from '../store'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/memories', label: 'Memories', icon: Image },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  if (!user) return null

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            C
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            Chronicle<span className="text-indigo-600">.ai</span>
          </span>
        </div>

        <nav
          data-lenis-prevent="true"
          className="flex-1 px-4 py-6 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/'
                ? location.pathname === '/' || location.pathname === '/home'
                : location.pathname.startsWith(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user.fullName || user.username}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  @{user.username}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
