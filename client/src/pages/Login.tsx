import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { loginApi, getMeApi } from '../api'
import { showToast } from '../utils/toast'

import friendsImg from '../assets/memories/friends.jpg'
import mountainsImg from '../assets/memories/mountains.jpg'
import concertImg from '../assets/memories/concert.jpg'
import codeImg from '../assets/memories/code.jpg'
import natureImg from '../assets/memories/nature.jpg'

const smoothEase = [0.16, 1, 0.3, 1] as const

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: smoothEase,
    },
  },
}

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    getMeApi()
      .then((data) => {
        if (data?.success && data?.user) {
          navigate('/')
        }
      })
      .catch(() => {})
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await loginApi({ identifier, password })
      showToast('Welcome back! Login successful.', 'success', 5000)
      navigate('/')
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafd] text-slate-800 flex items-center justify-center selection:bg-indigo-500 selection:text-white py-8 lg:py-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[460px] h-[460px] rounded-full bg-indigo-100/30 blur-3xl" />
        <div className="absolute -top-20 right-10 w-[500px] h-[500px] rounded-full bg-purple-100/25 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-96 h-96 rounded-full bg-sky-100/25 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-center">
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center lg:translate-x-8"
        >
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center">
            <div className="mb-4 lg:mb-5">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
                Your{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  moments
                </span>
                ,<br />
                always with you.
              </h1>
              <p className="mt-2.5 text-slate-500 text-sm sm:text-base font-normal leading-relaxed max-w-lg">
                Save, search and relive your memories with the power of AI.
              </p>
            </div>

            <div className="relative h-[410px] sm:h-[440px] lg:h-[460px] w-full max-w-[660px] select-none">
              <motion.div
                whileHover={{
                  scale: 1.18,
                  rotate: 10,
                  transition: { type: 'spring', stiffness: 400, damping: 15 },
                }}
                className="absolute -top-3 left-4 sm:left-6 z-40 cursor-pointer drop-shadow-md"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#ffd33d] to-[#f59e0b] shadow-md shadow-amber-500/25 flex items-center justify-center relative overflow-hidden border border-amber-300/60">
                  <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-white/40 blur-[1px]" />
                  <div className="flex gap-2.5 mb-1 z-10">
                    <span className="text-slate-900 font-extrabold text-xs -rotate-12">^</span>
                    <span className="text-slate-900 font-extrabold text-xs rotate-12">^</span>
                  </div>
                  <div className="absolute bottom-2.5 w-6 h-3 bg-[#991b1b] rounded-b-full overflow-hidden flex justify-center">
                    <div className="w-4 h-1.5 bg-[#f43f5e] rounded-t-full mt-1.5" />
                  </div>
                </div>
              </motion.div>

              <div className="absolute -top-1 left-24 sm:left-28 z-20 flex flex-col items-center pointer-events-none">
                <span className="font-handwriting text-xl sm:text-2xl text-indigo-500/80 font-bold -rotate-12">
                  Good times
                </span>
                <svg
                  className="w-12 h-6 text-indigo-400/80 -rotate-6 -mt-0.5 ml-4"
                  viewBox="0 0 54 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 14 C 18 2, 38 4, 48 20" />
                  <path d="M40 18 L 48 20 L 49 11" />
                </svg>
              </div>

              <motion.div
                initial={{ rotate: -6 }}
                whileHover={{
                  y: -5,
                  rotate: -2,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute top-4 left-3 sm:left-6 w-48 sm:w-56 lg:w-60 bg-white p-2.5 pb-3.5 rounded-2xl shadow-lg shadow-slate-300/40 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-30 sm:h-34 lg:h-38 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={friendsImg}
                    alt="Friends sunset"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: 6 }}
                whileHover={{
                  y: -5,
                  rotate: 2,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute top-2 right-4 sm:right-8 w-48 sm:w-56 lg:w-60 bg-white p-2.5 pb-3.5 rounded-2xl shadow-lg shadow-slate-300/40 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="relative w-full h-30 sm:h-34 lg:h-38 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={mountainsImg}
                    alt="Mountain Lake"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                  <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px] text-white font-medium shadow-xs">
                    <span>🕒</span>
                    <span>16:45</span>
                  </div>
                </div>
              </motion.div>

              <div className="absolute top-16 -right-1 sm:right-2 z-20 flex flex-col gap-0.5 text-indigo-400/80 pointer-events-none">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="6" x2="16" y2="4" />
                  <line x1="2" y1="12" x2="14" y2="12" />
                  <line x1="4" y1="18" x2="16" y2="20" />
                </svg>
              </div>

              <motion.div
                initial={{ rotate: -8 }}
                whileHover={{
                  y: -5,
                  rotate: -3,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute bottom-12 left-0 sm:left-2 w-44 sm:w-52 lg:w-56 bg-white p-2.5 pb-3.5 rounded-2xl shadow-md shadow-slate-300/35 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-28 sm:h-32 lg:h-34 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={codeImg}
                    alt="Workspace with notebook"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: 8 }}
                whileHover={{
                  y: -5,
                  rotate: 3,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute bottom-12 right-0 sm:right-2 w-44 sm:w-52 lg:w-56 bg-white p-2.5 pb-3.5 rounded-2xl shadow-md shadow-slate-300/35 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-28 sm:h-32 lg:h-34 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={natureImg}
                    alt="Sunny girl in forest"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: -1.5 }}
                whileHover={{
                  y: -5,
                  rotate: 0,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute bottom-0 left-1/2 -translate-x-1/2 w-52 sm:w-60 lg:w-64 bg-white p-2.5 pb-3.5 rounded-2xl shadow-xl shadow-slate-400/35 hover:shadow-2xl hover:shadow-slate-400/50 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-32 sm:h-36 lg:h-40 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={concertImg}
                    alt="Concert lights"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -3,
                  boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.2)',
                  transition: { duration: 0.2, ease: smoothEase },
                }}
                className="group absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center gap-2.5 bg-white px-4 py-2 rounded-full shadow-xl shadow-indigo-500/15 border border-indigo-100/70 whitespace-nowrap cursor-pointer transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                  ✦
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-slate-800 tracking-tight">
                  What happened during my first project?
                </span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:translate-x-0.5 flex-shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  scale: 1.18,
                  rotate: 6,
                  transition: { type: 'spring', stiffness: 400, damping: 15 },
                }}
                className="absolute bottom-10 right-6 sm:right-10 z-40 cursor-pointer drop-shadow-md"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#f43f5e] via-[#e11d48] to-[#fb7185] shadow-md shadow-rose-500/30 flex items-center justify-center relative overflow-hidden border border-rose-300/40">
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/35 blur-[1px]" />
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white fill-current filter drop-shadow-xs" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  scale: 1.18,
                  rotate: -6,
                  transition: { type: 'spring', stiffness: 400, damping: 15 },
                }}
                className="absolute top-28 -left-3 sm:-left-4 z-40 cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-md shadow-amber-400/25 flex items-center justify-center text-xs sm:text-sm border border-yellow-200">
                  ✨
                </div>
              </motion.div>

              <div className="absolute -bottom-4 right-8 sm:right-12 z-20 flex items-start gap-1 pointer-events-none">
                <svg
                  className="w-8 h-8 text-indigo-400/80 -rotate-12 mt-1"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 30 C 14 36, 26 32, 28 14" />
                  <path d="M21 16 L 28 14 L 32 20" />
                </svg>
                <span className="font-handwriting text-base sm:text-lg text-indigo-500/80 font-bold rotate-6 text-left leading-tight">
                  Same people,<br />new chapters
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:col-span-5 flex justify-center lg:justify-start lg:pl-6">
            <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="mb-4 text-center">
                <h2 className="text-2xl sm:text-[27px] font-bold text-slate-900 tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Log in to continue to your memories
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                    Email, Username or Phone
                  </label>
                  <div className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-2.5 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-colors">
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Mobile number, username or email"
                      className="w-full h-full bg-transparent text-sm sm:text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                    Password
                  </label>
                  <div className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-2.5 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-colors">
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full h-full bg-transparent text-sm sm:text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm sm:text-[15px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Log in</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </form>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent!')}
                  className="text-xs sm:text-[13px] text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative bg-white px-3 text-xs text-slate-400 font-normal">
                  or
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => alert('Signing in with Google...')}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50/80 bg-white text-slate-700 text-sm font-medium flex items-center justify-center gap-2.5 transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.06-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.96 6.68-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </motion.button>

              <div className="mt-3 text-center text-xs sm:text-sm text-slate-500">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Create one
                </Link>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-400 text-center leading-relaxed mt-2.5">
                By continuing, you agree to our{' '}
                <a href="#terms" className="text-slate-600 hover:underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-slate-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
