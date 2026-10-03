import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch, fetchCurrentUser, fetchMemories } from '../store'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import CreateMemoryModal from '../components/CreateMemoryModal'

export default function DashboardLayout() {
  const { user, isLoading: isAuthLoading } = useAppSelector((state) => state.auth)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    ;(window as any).__lenis?.scrollTo(0, { immediate: true })
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true

    dispatch(fetchCurrentUser())
      .unwrap()
      .then(() => {
        if (isMounted) {
          dispatch(fetchMemories())
        }
      })
      .catch(() => {
        if (isMounted) {
          navigate('/login')
        }
      })

    return () => {
      isMounted = false
    }
  }, [dispatch, navigate])

  if (isAuthLoading && !user) {
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
    <div className="min-h-screen w-full bg-[#f8fafd] flex flex-col selection:bg-indigo-500 selection:text-white">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      <CreateMemoryModal />
    </div>
  )
}
