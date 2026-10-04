import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  X,
  FolderOpen,
} from 'lucide-react'
import { useAppSelector } from '../store'
import {
  sendChatMessageApi,
  type ChatMessage,
  type ChatSourceCitation,
} from '../api'
import MarkdownRenderer from '../components/MarkdownRenderer'

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
  const [activePreviewChunk, setActivePreviewChunk] = useState<ChatSourceCitation | null>(null)
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialMemoryId) {
      setSelectedMemoryId(initialMemoryId)
    }
  }, [initialMemoryId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    setActivePreviewChunk(null)
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
    if (mimeType === 'note' || filename === 'Note') {
      return <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    }
    if (mimeType?.includes('json') || mimeType?.includes('html') || mimeType?.includes('csv')) {
      return <FileCode className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
    }
    return <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
  }

  const handleCopyChunk = async (chunk: ChatSourceCitation) => {
    try {
      await navigator.clipboard.writeText(chunk.content)
      setCopiedChunkId(chunk.id)
      setTimeout(() => setCopiedChunkId(null), 2000)
    } catch {
    }
  }

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim()
    if (!textToSend || isLoading) return

    const userMessage: ExtendedMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!customPrompt) {
      setInputMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    setIsLoading(true)

    const historyPayload: ChatMessage[] = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    try {
      const response = await sendChatMessageApi({
        message: textToSend,
        memoryId: selectedMemoryId || undefined,
        history: historyPayload,
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
        content: "Sorry, I couldn't generate an answer based on your memories. Please verify your query or try again.",
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

  const suggestedQuestions = selectedMemory
    ? [
        `Summarize the key information across all files in "${selectedMemory.title}"`,
        'What specific skills, details, or steps are documented in the files?',
        'What timeline dates, milestones, or decisions are mentioned?',
        'Highlight any discrepancies, notes, or important action items.',
      ]
    : [
        'Summarize the most important information across all my uploaded memories.',
        'What files, documents, and visual media do I have stored?',
        'Extract any skills, accomplishments, or work history from my documents.',
        'Find any action items or deadlines mentioned in my notes.',
      ]

  return (
    <div className="-m-3.5 sm:-m-5 lg:-m-6 flex flex-col h-[calc(100vh-4rem)] bg-[#f8fafd] overflow-hidden">
      <div className="h-14 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                Chronicle Memory AI
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                pgvector + RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden md:block">
              Answers synthesize all attached files, transcripts, notes, and media
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedMemoryId}
              onChange={(e) => handleSelectMemory(e.target.value)}
              className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer max-w-[200px] sm:max-w-xs truncate"
            >
              <option value="">All Memories (Global Knowledge)</option>
              {memories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.media?.length || 0} files)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Reset conversation"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        data-lenis-prevent="true"
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs mb-4">
                <Bot className="w-7 h-7" />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                {selectedMemory ? `Inquire about "${selectedMemory.title}"` : 'AI Memory Assistant'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
                {selectedMemory
                  ? `Directly referencing all ${selectedMemory.media?.length || 0} attached files, transcripts, notes, and documents in this memory.`
                  : 'Ask any question across all documents, PDF resumes, image flowcharts, audio transcripts, and notes.'}
              </p>

              {selectedMemory && selectedMemory.media && selectedMemory.media.length > 0 && (
                <div className="w-full max-w-lg mb-6 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Active Context Documents ({selectedMemory.media.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMemory.media.map((file) => (
                      <span
                        key={file.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        {getFileIcon(file.type, file.name)}
                        <span className="truncate max-w-[140px]">{file.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full max-w-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  <span>Suggested Inquiries</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="p-3 text-xs text-left text-slate-700 bg-white hover:bg-indigo-50/70 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200/80 rounded-xl transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                    >
                      <span className="font-medium">{q}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-2xs leading-relaxed text-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs font-normal'
                          : message.error
                            ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                            : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>

                    {!isUser && message.sources && message.sources.length > 0 && (
                      <div className="mt-2.5 w-full bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-indigo-600" />
                            <span>Retrieved Context ({message.sources.length})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Click to preview chunk</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {message.sources.map((source, sIdx) => {
                            const relevanceScore = Math.round(source.similarity * 100)
                            return (
                              <button
                                key={source.id || sIdx}
                                onClick={() => setActivePreviewChunk(source)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-300 transition-all text-slate-700 hover:text-indigo-700 cursor-pointer shadow-2xs"
                              >
                                {getFileIcon(source.mimeType, source.filename)}
                                <span className="font-semibold truncate max-w-[130px]">
                                  {source.filename || 'Document'}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100/70 text-indigo-800">
                                  {relevanceScore}%
                                </span>
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
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )
            })
          )}

          {isLoading && (
            <div className="flex gap-3.5 justify-start items-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                </div>
                <span className="text-xs text-slate-600 font-medium">
                  Retrieving relevant memory chunks & synthesizing answer...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200/80 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-end gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-2xs"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedMemory
                  ? `Ask anything about ${selectedMemory.title}...`
                  : 'Ask about any document, note, image, or transcript in memories...'
              }
              disabled={isLoading}
              className="flex-1 max-h-28 resize-none bg-transparent px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 mt-1.5">
            <span>
              {selectedMemory ? (
                <>
                  Context: <strong className="text-slate-600">{selectedMemory.title}</strong>
                </>
              ) : (
                'Context: Global Knowledge across all memories'
              )}
            </span>
            <span className="hidden sm:inline">Shift + Enter for new line · Enter to send</span>
          </div>
        </div>
      </div>

      {activePreviewChunk &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0">
                    {getFileIcon(activePreviewChunk.mimeType, activePreviewChunk.filename)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {activePreviewChunk.filename || 'Document Chunk'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Chunk #{activePreviewChunk.chunkIndex + 1}</span>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600">
                        {Math.round(activePreviewChunk.similarity * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyChunk(activePreviewChunk)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy chunk text"
                  >
                    {copiedChunkId === activePreviewChunk.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setActivePreviewChunk(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                data-lenis-prevent="true"
                className="p-5 overflow-y-auto flex-1 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50/50"
              >
                {activePreviewChunk.content}
              </div>

              <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
                <span>{activePreviewChunk.content.length} characters</span>
                <button
                  onClick={() => setActivePreviewChunk(null)}
                  className="px-4 py-1.5 font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
