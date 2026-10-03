import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Edit3,
  Upload,
  Tag,
  Plus,
  X,
  Download,
  Loader2,
  FileText,
  File,
  StickyNote,
  Paperclip,
  Copy,
  Check,
} from 'lucide-react'
import {
  useAppSelector,
  useAppDispatch,
  openEditModal,
  deleteMemory,
  uploadMemoryMedia,
  deleteMemoryMedia,
  updateMemory,
} from '../store'
import { getMemoryByIdApi, type Memory, type MemoryMedia } from '../api'
import { showToast } from '../utils/toast'

export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const memories = useAppSelector((state) => state.memories.memories)
  const [memory, setMemory] = useState<Memory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Tag editing state
  const [newTagInput, setNewTagInput] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)

  // Simple Upload Form State (File + Optional Accompanying Text)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [noteText, setNoteText] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Find memory from store or fetch from API
  useEffect(() => {
    if (!id) return

    const found = memories.find((m) => m.id === id)
    if (found) {
      setMemory(found)
      setIsLoading(false)
    } else {
      setIsLoading(true)
      getMemoryByIdApi(id)
        .then((res) => {
          if (res.success && res.data) {
            setMemory(res.data)
          } else {
            showToast('Memory not found', 'error')
            navigate('/memories')
          }
        })
        .catch(() => {
          showToast('Failed to load memory', 'error')
          navigate('/memories')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [id, memories, navigate])

  // Extract clean tags (no #)
  const tagsList = useMemo(() => {
    if (!memory?.tags) return []
    if (Array.isArray(memory.tags)) {
      return memory.tags
        .map((t) => String(t).trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    if (typeof memory.tags === 'string') {
      return memory.tags
        .split(',')
        .map((t) => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
    return []
  }, [memory?.tags])

  // Helper to determine media type
  const getItemType = (item: MemoryMedia): 'photo' | 'pdf' | 'note' | 'document' => {
    if ((item.type === 'note' || item.content) && !item.url) return 'note'
    if (
      item.type === 'application/pdf' ||
      item.type?.includes('pdf') ||
      item.name?.toLowerCase().endsWith('.pdf')
    ) {
      return 'pdf'
    }
    if (
      item.type?.startsWith('image/') ||
      item.url?.startsWith('data:image') ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name || '')
    ) {
      return 'photo'
    }
    return 'document'
  }

  // Media list
  const mediaList: MemoryMedia[] = memory?.media || []

  // Handle status toggle
  const handleToggleStatus = async () => {
    if (!memory) return
    const nextStatus = memory.status === 'ongoing' ? 'completed' : 'ongoing'
    const today = new Date().toISOString().split('T')[0]

    const result = await dispatch(
      updateMemory({
        id: memory.id,
        payload: {
          status: nextStatus,
          ended: nextStatus === 'completed' ? (memory.ended || today) : undefined,
        },
      }),
    )

    if (updateMemory.fulfilled.match(result)) {
      setMemory(result.payload)
    }
  }

  // Handle delete memory
  const handleDeleteMemory = async () => {
    if (!memory) return
    if (window.confirm(`Are you sure you want to delete "${memory.title}"?`)) {
      await dispatch(deleteMemory(memory.id))
      navigate('/memories')
    }
  }

  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!memory) return
    const clean = newTagInput.trim().replace(/^#+/, '')
    if (!clean) {
      setIsAddingTag(false)
      return
    }
    if (tagsList.includes(clean)) {
      setNewTagInput('')
      setIsAddingTag(false)
      return
    }

    const updatedTags = [...tagsList, clean]
    const result = await dispatch(
      updateMemory({
        id: memory.id,
        payload: { tags: updatedTags },
      }),
    )
    if (updateMemory.fulfilled.match(result)) {
      setMemory(result.payload)
      setNewTagInput('')
      setIsAddingTag(false)
    }
  }

  // Handle removing a tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!memory) return
    const updatedTags = tagsList.filter((t) => t !== tagToRemove)
    const result = await dispatch(
      updateMemory({
        id: memory.id,
        payload: { tags: updatedTags },
      }),
    )
    if (updateMemory.fulfilled.match(result)) {
      setMemory(result.payload)
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Handle submitting the upload form (File with optional text, or text note alone)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memory) return

    if (!selectedFile && !noteText.trim()) {
      showToast('Please select a file or enter some text', 'error')
      return
    }

    setIsUploading(true)
    try {
      if (selectedFile) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })

        let fileType = selectedFile.type || 'application/octet-stream'
        if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
          fileType = 'application/pdf'
        }

        const result = await dispatch(
          uploadMemoryMedia({
            id: memory.id,
            media: {
              name: selectedFile.name,
              url: dataUrl,
              type: fileType,
              size: selectedFile.size,
              content: noteText.trim() || undefined,
            },
          }),
        )

        if (uploadMemoryMedia.fulfilled.match(result)) {
          setMemory(result.payload)
          setSelectedFile(null)
          setNoteText('')
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      } else {
        const result = await dispatch(
          uploadMemoryMedia({
            id: memory.id,
            media: {
              name: 'Note',
              type: 'note',
              content: noteText.trim(),
              size: new Blob([noteText]).size,
            },
          }),
        )

        if (uploadMemoryMedia.fulfilled.match(result)) {
          setMemory(result.payload)
          setNoteText('')
        }
      }
    } catch {
      showToast('Failed to add attachment', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle delete media
  const handleDeleteMedia = async (mediaId: string) => {
    if (!memory) return
    if (window.confirm('Delete this item?')) {
      const result = await dispatch(
        deleteMemoryMedia({ id: memory.id, mediaId }),
      )
      if (deleteMemoryMedia.fulfilled.match(result)) {
        setMemory(result.payload)
      }
    }
  }

  // Handle copy text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast('Copied to clipboard', 'success')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Helper format bytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="w-full py-10 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading memory...</p>
      </div>
    )
  }

  if (!memory) return null

  const isOngoing = memory.status === 'ongoing'

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/memories"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Memories</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(openEditModal(memory))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={handleDeleteMemory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-all shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Memory Details Card (Optimized padding & gaps) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 lg:p-6 shadow-xs space-y-4">
        {/* Title, Dates & Status */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  isOngoing
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isOngoing ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Ongoing</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Completed</span>
                  </>
                )}
              </span>

              <button
                onClick={handleToggleStatus}
                title="Toggle status"
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 hover:underline cursor-pointer"
              >
                Mark as {isOngoing ? 'Completed' : 'Ongoing'}
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {memory.title}
            </h1>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-1 text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Started:</span>
              <span>{memory.started}</span>
            </div>
            {memory.ended && memory.status === 'completed' && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Ended:</span>
                <span>{memory.ended}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags Row */}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" />
              <span>Tags:</span>
            </span>

            {tagsList.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                  title="Remove tag"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    } else if (e.key === 'Escape') {
                      setIsAddingTag(false)
                      setNewTagInput('')
                    }
                  }}
                  onBlur={handleAddTag}
                  placeholder="tag name..."
                  className="px-2 py-0.5 rounded-md text-xs bg-white border border-indigo-400 text-slate-900 outline-none w-24"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>Add Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-100">
            {memory.description}
          </p>
        </div>
      </div>

      {/* Upload & Collage Section (Optimized layout & spacing) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              <span>Memory Collage & Documents</span>
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {mediaList.length}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Curated memories & attachments
          </span>
        </div>

        {/* Compact Upload Bar: File + Text input */}
        <form
          onSubmit={handleUploadSubmit}
          className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* File Selector Button */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="*/*"
                className="hidden"
                id="memory-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedFile ? 'Change File' : 'Choose File'}</span>
              </button>
            </div>

            {/* Selected File Indicator */}
            {selectedFile ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-800">
                <Paperclip className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-[320px]">{selectedFile.name}</span>
                <span className="text-slate-400 text-[10px]">({formatBytes(selectedFile.size)})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                Pick a photo, PDF, or document (or leave blank to create a text note)
              </span>
            )}
          </div>

          {/* Text / Note Input Accompanying Document */}
          <div>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add caption, thoughts, or details for this item..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 resize-y"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isUploading || (!selectedFile && !noteText.trim())}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{selectedFile ? 'Add to Collage' : 'Pin Note'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Professional Collage Grid (Tight masonry columns, responsive up to 4 cols) */}
        {mediaList.length > 0 ? (
          <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-3.5 [column-fill:_balance]">
            {mediaList.map((item) => {
              const itemType = getItemType(item)

              // 1. Photo Collage Card
              if (itemType === 'photo' && item.url) {
                return (
                  <div
                    key={item.id}
                    className="break-inside-avoid mb-3.5 bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group flex flex-col"
                  >
                    {/* Photo Visual Frame */}
                    <div className="relative overflow-hidden bg-slate-100">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-auto object-cover max-h-80 group-hover:scale-[1.02] transition-transform duration-300"
                      />
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-900/75 backdrop-blur-xs text-white">
                        Photo
                      </span>
                    </div>

                    {/* Accompanying Caption / Note */}
                    <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                      {item.content ? (
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </p>
                      ) : null}

                      {/* Card Footer: Metadata & Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div className="min-w-0 pr-1">
                          <p className="font-semibold text-slate-700 truncate text-[11px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.size ? formatBytes(item.size) : ''}
                            {item.uploadedAt ? ` • ${new Date(item.uploadedAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.content && (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.content || '', item.id)}
                              title="Copy caption"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <a
                            href={item.url}
                            download={item.name}
                            title="Download photo"
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item.id)}
                            title="Delete item"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // 2. PDF Document Card
              if (itemType === 'pdf') {
                return (
                  <div
                    key={item.id}
                    className="break-inside-avoid mb-3.5 bg-white rounded-xl border border-rose-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Document Type Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          PDF
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words mb-1">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-2">
                        {formatBytes(item.size)}
                        {item.uploadedAt ? ` • ${new Date(item.uploadedAt).toLocaleDateString()}` : ''}
                      </p>

                      {/* Accompanying Document Text / Note */}
                      {item.content && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed mb-2.5">
                          {item.content}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {item.url ? (
                        <a
                          href={item.url}
                          download={item.name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      ) : <span />}

                      <div className="flex items-center gap-1">
                        {item.content && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.content || '', item.id)}
                            title="Copy text"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          title="Delete document"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              // 3. Standalone Note Card (Collage Pinboard Note)
              if (itemType === 'note') {
                return (
                  <div
                    key={item.id}
                    className="break-inside-avoid mb-3.5 bg-amber-50/60 rounded-xl border border-amber-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Note Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                          <StickyNote className="w-3.5 h-3.5" />
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Note
                        </span>
                      </div>

                      {item.name && item.name !== 'Note' ? (
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">
                          {item.name}
                        </h4>
                      ) : null}

                      {/* Note Content */}
                      <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                        {item.content || '(Empty note)'}
                      </p>
                    </div>

                    {/* Note Footer */}
                    <div className="pt-2 mt-3 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-800/70">
                      <span>
                        {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'Memo'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.content || '', item.id)}
                          title="Copy text"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer text-[11px] font-semibold"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          title="Delete note"
                          className="p-1 rounded-md text-amber-700 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              // 4. Other Document Card
              return (
                <div
                  key={item.id}
                  className="break-inside-avoid mb-3.5 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                        <File className="w-3.5 h-3.5" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        Attachment
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words mb-1">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-2">
                      {formatBytes(item.size)}
                      {item.uploadedAt ? ` • ${new Date(item.uploadedAt).toLocaleDateString()}` : ''}
                    </p>

                    {/* Accompanying text */}
                    {item.content && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed mb-2.5">
                        {item.content}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {item.url ? (
                      <a
                        href={item.url}
                        download={item.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    ) : <span />}

                    <div className="flex items-center gap-1">
                      {item.content && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.content || '', item.id)}
                          title="Copy text"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(item.id)}
                        title="Delete file"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs sm:text-sm font-medium">
              No items in this memory collage yet. Select a file or write a note above to add your first item.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
