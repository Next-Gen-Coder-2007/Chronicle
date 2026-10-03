import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeApi, logoutApi, type User } from '../api'
import { showToast } from '../utils/toast'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    <div className="min-h-screen w-full bg-[#f8fafd] flex">
      {/* Simple Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Simple Navbar */}
        <Navbar
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={currentTab}
        />

        {/* Home Page Content: Empty as requested */}
        <main className="flex-1 p-6" />
      </div>
    </div>
  )
}
