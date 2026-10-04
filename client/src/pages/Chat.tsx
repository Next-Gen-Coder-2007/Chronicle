import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  FileText,
  ChevronDown,
  FileCode,
  Music,
  Video,
  Image as ImageIcon,
  StickyNote,
  Layers,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { useAppSelector } from '../store'
import {
  sendChatMessageApi,
  type ChatMessage,
  type ChatSourceCitation,
} from '../api'
import MarkdownRenderer from '../components/MarkdownRenderer'
import MediaInspectorModal from '../components/MediaInspectorModal'

interface ExtendedMessage extends ChatMessage {
  id: string
  sources?: ChatSourceCitation[]
  timestamp: string
  error?: boolean
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMemoryId = searchParams.get('memoryId') || ''

  const { memories } = useAppSelector((state) => state.memories)
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>(initialMemoryId)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inspectingCitation, setInspectingCitation] = useState<ChatSourceCitation | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialMemoryId) {
      setSelectedMemoryId(initialMemoryId)
    }
  }, [initialMemoryId])

  useEffect(() => {
    if (messagesEndRef.current) {
      const lenis = (window as any).__lenis
      if (lenis) {
        lenis.scrollTo(messagesEndRef.current, { offset: -100, duration: 0.8 })
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages, isLoading])

  const selectedMemory = memories.find((m) => m.id === selectedMemoryId)

  const handleSelectMemory = (id: string) => {
    setSelectedMemoryId(id)
    if (id) {
      setSearchParams({ memoryId: id })
    } else {
      setSearchParams({})
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setInspectingCitation(null)
  }

  const getFileIcon = (mimeType?: string, filename?: string) => {
    if (mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(filename || '')) {
      return <Video className="w-3.5 h-3.5 text-violet-600 shrink-0" />
    }
    if (mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(filename || '')) {
      return <Music className="w-3.5 h-3.5 text-pink-600 shrink-0" />
    }
    if (mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(filename || '')) {
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    }
    if (mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    }
    if (mimeType?.includes('word') || filename?.toLowerCase().endsWith('.docx')) {
      return <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
    }
    if (mimeType?.includes('sheet') || filename?.toLowerCase().endsWith('.csv')) {
      return <FileCode className="w-3.5 h-3.5 text-teal-600 shrink-0" />
    }
    if (mimeType?.includes('json') || filename?.toLowerCase().endsWith('.json')) {
      return <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
    }
    return <StickyNote className="w-3.5 h-3.5 text-slate-500 shrink-0" />
  }

  const handleCopyMessage = async (msg: ExtendedMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content)
      setCopiedMessageId(msg.id)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch {}
  }

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || inputMessage
    if (!textToSend.trim() || isLoading) return

    const userMessage: ExtendedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const historyToSend: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await sendChatMessageApi({
        message: userMessage.content,
        history: historyToSend,
        memoryId: selectedMemoryId || undefined,
      })

      const assistantMessage: ExtendedMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: ExtendedMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I couldn't find sufficient information in your memories to answer this question. Try rephrasing or selecting another memory scope.",
        error: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedInquiries = [
    'Summarize the most important information across all my uploaded memories.',
    'What files, documents, and visual media do I have stored?',
    'Extract any skills, accomplishments, or work history from my documents.',
    'Find any action items or deadlines mentioned in my notes.',
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-4xl mx-auto w-full">
      {/* Top Controls: Scope Selector & Reset */}
      <div className="sticky top-16 z-20 bg-[#f8fafd]/95 backdrop-blur-md flex items-center justify-between py-2.5 mb-4 shrink-0 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700">Grounded Memory RAG</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedMemoryId}
              onChange={(e) => handleSelectMemory(e.target.value)}
              className="appearance-none bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">All Memories (Global Knowledge)</option>
              {memories.map((m) => (
                <option key={m.id} value={m.id}>
                  Memory: {m.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white bg-white/70 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8 sm:py-12 flex flex-col items-center text-center space-y-5">
            {/* Minimalist Bot Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 max-w-lg">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                AI Memory Assistant
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Ask any question across all documents, PDF resumes, image flowcharts, audio transcripts, and notes.
              </p>
            </div>

            {/* Suggested Inquiries */}
            <div className="w-full max-w-xl space-y-2 pt-4 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Suggested Inquiries</span>
              </div>

              <div className="space-y-2">
                {suggestedInquiries.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(promptText)}
                    className="w-full p-3.5 bg-white hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 hover:border-indigo-300 text-xs text-slate-700 font-medium transition-all text-left cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{promptText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 sm:gap-4 items-start ${
                    isUser ? 'justify-end' : 'justify-start'
                  } animate-in fade-in duration-200`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col min-w-0 max-w-[88%] sm:max-w-[82%] ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-4 sm:p-5 rounded-2xl shadow-xs leading-relaxed text-xs sm:text-sm ${
                        isUser
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-xs font-normal'
                          : message.error
                            ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                            : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs shadow-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="space-y-3">
                          <MarkdownRenderer content={message.content} />

                          {/* Quick copy assistant answer button */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 text-slate-400">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Evidence-grounded response</span>
                            </span>
                            <button
                              onClick={() => handleCopyMessage(message)}
                              className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy answer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Retrieved Sources Ribbon */}
                    {!isUser && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 w-full bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Retrieved Evidence ({message.sources.length} sources)</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Click any source to inspect in-app
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {message.sources.map((source, sIdx) => {
                            const relevanceScore = Math.round(
                              (source.relevanceScore ?? source.similarity) * 100,
                            )
                            const sMime = source.mimeType || ''
                            const sName = source.filename || source.documentName || 'Document'
                            const isImg = sMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(sName)
                            const isAud = sMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(sName)
                            const isVid = sMime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(sName)

                            const rawPage = source.page ?? source.pageNumber
                            const numPage = typeof rawPage === 'number' ? rawPage : rawPage != null ? Number(rawPage) : null
                            const hasPage = !isImg && !isAud && !isVid && numPage !== null && !isNaN(numPage) && numPage > 0

                            const rawStart = source.startTime ?? source.startTimestamp
                            const rawEnd = source.endTime ?? source.endTimestamp
                            const numStart = typeof rawStart === 'number' ? rawStart : rawStart != null ? Number(rawStart) : null
                            const numEnd = typeof rawEnd === 'number' ? rawEnd : rawEnd != null ? Number(rawEnd) : null
                            const hasTimestamp = (isAud || isVid) && (
                              (numStart !== null && !isNaN(numStart) && numStart > 0) ||
                              (numEnd !== null && !isNaN(numEnd) && numEnd > 0)
                            )

                            return (
                              <button
                                key={source.id || sIdx}
                                onClick={() => setInspectingCitation(source)}
                                className="group p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center justify-between gap-2.5 text-left cursor-pointer shadow-2xs hover:shadow-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 group-hover:border-indigo-200 shrink-0">
                                    {getFileIcon(source.mimeType, source.filename)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                                      {sName}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                      {hasPage && (
                                        <span className="font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200/80">
                                          p. {numPage}
                                        </span>
                                      )}
                                      {hasTimestamp && numStart !== null && (
                                        <span className="font-semibold text-purple-700 bg-purple-50 px-1 rounded border border-purple-200/80">
                                          {Math.floor(numStart / 60)}:
                                          {String(Math.floor(numStart % 60)).padStart(2, '0')}
                                        </span>
                                      )}
                                      <span className="truncate">
                                        Chunk #{source.chunkIndex + 1}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0 pl-1">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                    {relevanceScore}%
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {message.timestamp}
                    </span>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="max-w-4xl mx-auto flex gap-3.5 justify-start items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              </div>
              <span className="text-xs text-slate-600 font-semibold">
                Searching pgvector index, reranking candidate chunks & synthesizing grounded response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Modern Floating Sticky Input Dock */}
      <div className="sticky bottom-4 z-20 pt-3 bg-gradient-to-t from-[#f8fafd] via-[#f8fafd]/95 to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-end gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-md"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMemory
                ? `Ask anything grounded in "${selectedMemory.title}"...`
                : 'Ask about any document, note, image, or transcript in memories...'
            }
            disabled={isLoading}
            className="flex-1 max-h-36 resize-none bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 mt-1.5 pb-1">
          <span className="flex items-center gap-1.5">
            <span>Context:</span>
            <strong className="text-slate-600 font-semibold">
              {selectedMemory ? selectedMemory.title : 'Global Knowledge across all memories'}
            </strong>
          </span>
          <span className="hidden sm:inline">Shift + Enter for new line · Enter to send</span>
        </div>
      </div>

      {/* In-App Media & Source Inspector Modal (Zero raw server links) */}
      <MediaInspectorModal
        citation={inspectingCitation}
        onClose={() => setInspectingCitation(null)}
      />
    </div>
  )
}
