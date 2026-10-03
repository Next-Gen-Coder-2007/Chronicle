import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { registerApi, getMeApi } from '../api'
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

interface Country {
  name: string
  code: string
  dial: string
  placeholder: string
}

const COUNTRIES: Country[] = [
  { name: 'United States', code: 'US', dial: '+1', placeholder: '(555) 000-0000' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', placeholder: '7911 123456' },
  { name: 'India', code: 'IN', dial: '+91', placeholder: '98765 43210' },
  { name: 'Canada', code: 'CA', dial: '+1', placeholder: '(555) 000-0000' },
  { name: 'Australia', code: 'AU', dial: '+61', placeholder: '412 345 678' },
  { name: 'Germany', code: 'DE', dial: '+49', placeholder: '151 1234567' },
  { name: 'France', code: 'FR', dial: '+33', placeholder: '6 12 34 56 78' },
  { name: 'Japan', code: 'JP', dial: '+81', placeholder: '90-1234-5678' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', placeholder: '50 123 4567' },
  { name: 'Singapore', code: 'SG', dial: '+65', placeholder: '8123 4567' },
  { name: 'Brazil', code: 'BR', dial: '+55', placeholder: '(11) 98765-4321' },
  { name: 'Netherlands', code: 'NL', dial: '+31', placeholder: '6 12345678' },
  { name: 'Switzerland', code: 'CH', dial: '+41', placeholder: '78 123 45 67' },
  { name: 'Spain', code: 'ES', dial: '+34', placeholder: '612 34 56 78' },
  { name: 'Italy', code: 'IT', dial: '+39', placeholder: '312 345 6789' },
  { name: 'South Korea', code: 'KR', dial: '+82', placeholder: '10-1234-5678' },
]

function CountryFlag({ code, className = 'w-5 h-3.5' }: { code: string; className?: string }) {
  const common = `${className} rounded-[2px] shadow-xs flex-shrink-0 ring-1 ring-black/10 overflow-hidden`

  switch (code) {
    case 'US':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#b22234" />
          <path d="M0 2.46h24M0 4.92h24M0 7.38h24M0 9.85h24M0 12.3h24M0 14.77h24" stroke="#fff" strokeWidth="1.23" />
          <rect width="10" height="8.6" fill="#3c3b6e" />
          <circle cx="2.5" cy="2.2" r="0.6" fill="#fff" />
          <circle cx="5" cy="2.2" r="0.6" fill="#fff" />
          <circle cx="7.5" cy="2.2" r="0.6" fill="#fff" />
          <circle cx="3.8" cy="4.3" r="0.6" fill="#fff" />
          <circle cx="6.3" cy="4.3" r="0.6" fill="#fff" />
          <circle cx="2.5" cy="6.4" r="0.6" fill="#fff" />
          <circle cx="5" cy="6.4" r="0.6" fill="#fff" />
          <circle cx="7.5" cy="6.4" r="0.6" fill="#fff" />
        </svg>
      )
    case 'GB':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#fff" strokeWidth="2.5" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.5" />
          <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="4.5" />
          <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.5" />
        </svg>
      )
    case 'IN':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="5.33" fill="#ff9933" />
          <rect y="5.33" width="24" height="5.34" fill="#ffffff" />
          <rect y="10.67" width="24" height="5.33" fill="#138808" />
          <circle cx="12" cy="8" r="2.2" fill="none" stroke="#000080" strokeWidth="0.6" />
          <circle cx="12" cy="8" r="0.6" fill="#000080" />
        </svg>
      )
    case 'CA':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#fff" />
          <rect width="6" height="16" fill="#d80027" />
          <rect x="18" width="6" height="16" fill="#d80027" />
          <path d="M12 4l1 3 2.5-0.5-1.5 2 1.5 2-3-0.5v2h-1v-2l-3 0.5 1.5-2-1.5-2L11 7z" fill="#d80027" />
        </svg>
      )
    case 'AU':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#00008b" />
          <rect width="10" height="7" fill="#012169" />
          <path d="M0 0l10 7M10 0L0 7" stroke="#fff" strokeWidth="1.2" />
          <path d="M5 0v7M0 3.5h10" stroke="#fff" strokeWidth="2.2" />
          <path d="M5 0v7M0 3.5h10" stroke="#c8102e" strokeWidth="1.2" />
          <circle cx="5" cy="11.5" r="1.3" fill="#fff" />
          <circle cx="18" cy="4" r="0.6" fill="#fff" />
          <circle cx="20" cy="7" r="0.6" fill="#fff" />
          <circle cx="18" cy="12" r="0.6" fill="#fff" />
          <circle cx="16" cy="8" r="0.6" fill="#fff" />
        </svg>
      )
    case 'DE':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="5.33" fill="#000" />
          <rect y="5.33" width="24" height="5.34" fill="#dd0000" />
          <rect y="10.67" width="24" height="5.33" fill="#ffce00" />
        </svg>
      )
    case 'FR':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="8" height="16" fill="#002395" />
          <rect x="8" width="8" height="16" fill="#ffffff" />
          <rect x="16" width="8" height="16" fill="#ed2939" />
        </svg>
      )
    case 'JP':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#ffffff" />
          <circle cx="12" cy="8" r="4.2" fill="#bc002d" />
        </svg>
      )
    case 'AE':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="5.33" fill="#00732f" />
          <rect y="5.33" width="24" height="5.34" fill="#ffffff" />
          <rect y="10.67" width="24" height="5.33" fill="#000000" />
          <rect width="6" height="16" fill="#ff0000" />
        </svg>
      )
    case 'SG':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="8" fill="#ed2939" />
          <rect y="8" width="24" height="8" fill="#ffffff" />
          <circle cx="4.5" cy="4" r="2.2" fill="#fff" />
          <circle cx="5.2" cy="4" r="2.2" fill="#ed2939" />
        </svg>
      )
    case 'BR':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#009c3b" />
          <path d="M12 2l9 6-9 6-9-6z" fill="#ffdf00" />
          <circle cx="12" cy="8" r="3.2" fill="#002776" />
        </svg>
      )
    case 'NL':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="5.33" fill="#ae1c28" />
          <rect y="5.33" width="24" height="5.34" fill="#ffffff" />
          <rect y="10.67" width="24" height="5.33" fill="#21468b" />
        </svg>
      )
    case 'CH':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#d52b1e" />
          <rect x="10.5" y="4" width="3" height="8" fill="#ffffff" />
          <rect x="8" y="6.5" width="8" height="3" fill="#ffffff" />
        </svg>
      )
    case 'ES':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="4" fill="#aa151b" />
          <rect y="4" width="24" height="8" fill="#f1bf00" />
          <rect y="12" width="24" height="4" fill="#aa151b" />
        </svg>
      )
    case 'IT':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#ffffff" />
          <rect x="16" width="8" height="16" fill="#ce2b37" />
        </svg>
      )
    case 'KR':
      return (
        <svg viewBox="0 0 24 16" className={common}>
          <rect width="24" height="16" fill="#ffffff" />
          <circle cx="12" cy="8" r="3.2" fill="#c60c30" />
          <path d="M12 11.2a3.2 3.2 0 0 1 0-6.4 1.6 1.6 0 0 1 0 3.2 1.6 1.6 0 0 0 0 3.2z" fill="#003478" />
        </svg>
      )
    default:
      return (
        <div className={`${common} bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600`}>
          {code}
        </div>
      )
  }
}

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0])
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMeApi()
      .then((data) => {
        if (data?.success && data?.user) {
          navigate('/')
        }
      })
      .catch(() => {})
  }, [navigate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dial.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' }
    let score = 0
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' }
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const fullPhoneNumber = phone.trim() ? `${selectedCountry.dial} ${phone.trim()}` : ''

    try {
      await registerApi({
        fullName,
        username,
        phone: fullPhoneNumber,
        email,
        password,
      })

      showToast('Account created successfully! Welcome to Chronicle.', 'success', 5000)
      navigate('/')
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = () => {
    alert('Connecting to Google Account...')
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
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center"
        >
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-end lg:pr-3">
            <div className="w-full max-w-[430px] bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 border border-slate-100 relative">
              <div className="mb-4 text-center">
                <h2 className="text-2xl sm:text-[27px] font-bold text-slate-900 tracking-tight">
                  Create an account
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sign up in seconds and start preserving memories
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                      Full Name
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-full bg-transparent text-sm sm:text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                      Username
                    </label>
                    <div className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-2 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-colors">
                      <span className="text-sm font-semibold text-slate-400 select-none">@</span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                        placeholder="johndoe"
                        className="w-full h-full bg-transparent text-sm sm:text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                    Phone Number
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="w-full h-11 rounded-xl border border-slate-200 bg-white flex items-center focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-colors overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="h-full flex items-center gap-2 pl-3 pr-2.5 hover:bg-slate-50 border-r border-slate-200 transition-colors cursor-pointer select-none flex-shrink-0"
                        title="Select Country Code"
                      >
                        <CountryFlag code={selectedCountry.code} />
                        <span className="text-sm font-semibold text-slate-800 tracking-tight leading-none">
                          {selectedCountry.dial}
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={selectedCountry.placeholder}
                        className="w-full h-full bg-transparent px-3 text-sm sm:text-[14.5px] font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>

                    <AnimatePresence>
                      {isCountryDropdownOpen && (
                        <motion.div
                          data-lenis-prevent="true"
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-2 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2.5 z-50 overflow-hidden overscroll-contain"
                        >
                          <div className="relative mb-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search country or code..."
                              className="w-full bg-slate-50 text-xs sm:text-sm pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 placeholder:text-slate-400 transition-colors"
                              autoFocus
                            />
                          </div>

                          <div
                            data-lenis-prevent="true"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            className="max-h-52 overflow-y-auto overscroll-contain touch-pan-y space-y-0.5 pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
                          >
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code + country.dial}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(country)
                                  setIsCountryDropdownOpen(false)
                                  setCountrySearch('')
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                                  selectedCountry.code === country.code
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <CountryFlag code={country.code} />
                                  <span className="truncate text-slate-800 font-medium text-sm">{country.name}</span>
                                </div>
                                <span className="font-semibold text-slate-500 text-xs sm:text-sm ml-2 flex-shrink-0">{country.dial}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="text-center py-4 text-sm text-slate-400">
                                No countries found
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1 ml-0.5">
                    Email Address
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
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
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
                      placeholder="Create a strong password"
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

                  {password && (
                    <div className="mt-1.5 px-0.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Strength:</span>
                        <span className="font-semibold text-slate-700">{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div className={`rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200'} transition-all`} />
                        <div className={`rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200'} transition-all`} />
                        <div className={`rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200'} transition-all`} />
                        <div className={`rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-200'} transition-all`} />
                      </div>
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm sm:text-[15px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-75"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create account</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </form>

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
                onClick={handleGoogleSignUp}
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
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Log in
                </Link>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-400 text-center leading-relaxed mt-2.5">
                By creating an account, you agree to our{' '}
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

          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center lg:pl-4">
            <div className="mb-3 lg:mb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
                Your story begins{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  today
                </span>
                .<br />
                Preserve every chapter.
              </h1>
              <p className="mt-2 text-slate-500 text-sm sm:text-base font-normal leading-relaxed max-w-md">
                Relive journeys, explore forgotten snapshots, and build a timeless timeline with AI.
              </p>
            </div>

            <div className="relative h-[390px] sm:h-[420px] lg:h-[440px] w-full max-w-[650px] select-none">
              <div className="absolute top-1 left-4 sm:left-8 z-20 flex flex-col items-start pointer-events-none">
                <span className="font-handwriting text-xl sm:text-2xl text-indigo-500/90 font-bold -rotate-6">
                  Where it all started ✨
                </span>
                <svg
                  className="w-10 h-5 text-indigo-400/80 -rotate-3 ml-6"
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
                initial={{ rotate: -5 }}
                whileHover={{
                  y: -5,
                  rotate: -1,
                  scale: 1.02,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute top-6 left-2 sm:left-6 w-40 sm:w-48 lg:w-52 bg-white p-2 sm:p-2.5 pb-3.5 rounded-2xl shadow-lg shadow-slate-300/40 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="relative w-full h-34 sm:h-38 lg:h-42 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={natureImg}
                    alt="Sunny portrait"
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px] text-white font-medium">
                    <span>✨</span>
                    <span>Golden hour</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: 4 }}
                whileHover={{
                  y: -5,
                  rotate: 1,
                  scale: 1.02,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute top-2 right-2 sm:right-6 w-52 sm:w-60 lg:w-64 bg-white p-2 sm:p-2.5 pb-3.5 rounded-2xl shadow-lg shadow-slate-300/40 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="relative w-full h-28 sm:h-32 lg:h-36 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={mountainsImg}
                    alt="Mountain range"
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                  <div className="absolute bottom-2 right-2 bg-indigo-600/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px] text-white font-medium shadow-xs">
                    <span>🏔️</span>
                    <span>Alpine Lake</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: -8 }}
                whileHover={{
                  y: -4,
                  rotate: -3,
                  scale: 1.03,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute bottom-10 -left-1 sm:left-2 w-38 sm:w-44 lg:w-48 bg-white p-2 pb-3 rounded-2xl shadow-md shadow-slate-300/35 hover:shadow-2xl hover:shadow-slate-300/60 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-24 sm:h-28 lg:h-30 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={codeImg}
                    alt="Creative desk"
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: -2 }}
                whileHover={{
                  y: -5,
                  rotate: 0,
                  scale: 1.02,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute bottom-2 right-10 sm:right-16 w-50 sm:w-56 lg:w-60 bg-white p-2 sm:p-2.5 pb-3.5 rounded-2xl shadow-xl shadow-slate-400/35 hover:shadow-2xl hover:shadow-slate-400/50 cursor-pointer transition-shadow z-20"
              >
                <div className="relative w-full h-30 sm:h-34 lg:h-38 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={friendsImg}
                    alt="Friends gathering"
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                  <div className="absolute top-2 right-2 bg-rose-600/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px] text-white font-medium">
                    <span>❤️</span>
                    <span>Reunion</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: 7 }}
                whileHover={{
                  y: -5,
                  rotate: 3,
                  scale: 1.03,
                  transition: { duration: 0.28, ease: smoothEase },
                }}
                className="group absolute top-36 -right-2 sm:right-1 w-36 sm:w-42 lg:w-46 bg-white p-2 pb-3 rounded-2xl shadow-md shadow-slate-300/35 hover:shadow-xl hover:shadow-slate-300/55 cursor-pointer transition-shadow z-10"
              >
                <div className="w-full h-22 sm:h-26 lg:h-28 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={concertImg}
                    alt="Concert stage lights"
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -3,
                  boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.2)',
                  transition: { duration: 0.2, ease: smoothEase },
                }}
                className="group absolute top-[48%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl shadow-indigo-500/15 border border-indigo-100/70 whitespace-nowrap cursor-pointer transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                  ✦
                </div>
                <span className="text-xs sm:text-[13.5px] font-semibold text-slate-800 tracking-tight">
                  Show photos from our roadtrip
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
                  scale: 1.15,
                  rotate: -10,
                  transition: { type: 'spring', stiffness: 400, damping: 15 },
                }}
                className="absolute top-1 right-28 sm:right-36 z-30 cursor-pointer drop-shadow-md"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#ffd33d] to-[#f59e0b] shadow-md shadow-amber-500/25 flex items-center justify-center relative overflow-hidden border border-amber-300/60">
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white/40 blur-[1px]" />
                  <div className="flex gap-1.5 mb-0.5 z-10 text-slate-900 font-extrabold text-[11px]">
                    <span>^</span>
                    <span>^</span>
                  </div>
                  <div className="absolute bottom-2 w-4.5 h-2 bg-[#991b1b] rounded-b-full overflow-hidden flex justify-center">
                    <div className="w-2.5 h-1 bg-[#f43f5e] rounded-t-full mt-0.5" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  scale: 1.15,
                  rotate: 8,
                  transition: { type: 'spring', stiffness: 400, damping: 15 },
                }}
                className="absolute bottom-12 -left-3 sm:-left-2 z-30 cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-md shadow-amber-400/25 flex items-center justify-center text-xs sm:text-sm border border-yellow-200">
                  ✨
                </div>
              </motion.div>

              <div className="absolute -bottom-3 right-4 sm:right-8 z-20 flex items-start gap-1 pointer-events-none">
                <svg
                  className="w-7 h-7 text-indigo-400/80 -rotate-12 mt-1"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 30 C 14 36, 26 32, 28 14" />
                  <path d="M21 16 L 28 14 L 32 20" />
                </svg>
                <span className="font-handwriting text-lg sm:text-xl text-indigo-500/85 font-bold rotate-4 text-left leading-tight">
                  Always vivid,<br />always yours
                </span>
              </div>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
