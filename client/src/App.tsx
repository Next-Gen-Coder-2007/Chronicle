import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useLenis from './hooks/useLenis'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Memories from './pages/Memories'
import Settings from './pages/Settings'
import StatusToast from './components/StatusToast'

export default function App() {
  useLenis()

  return (
    <BrowserRouter>
      <StatusToast />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}