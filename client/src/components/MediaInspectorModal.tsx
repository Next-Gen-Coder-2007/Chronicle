import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  FileCode,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
  Volume2,
  Play,
  Loader2,
  AlertCircle,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { fetchFileBlob, type ChatSourceCitation } from '../api'

interface MediaInspectorModalProps {
  citation: ChatSourceCitation | null
  onClose: () => void
}

export default function MediaInspectorModal({
  citation,
  onClose,
}: MediaInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'chunk' | 'metadata'>('media')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoadingBlob, setIsLoadingBlob] = useState(false)
  const [blobError, setBlobError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!citation) return

    const lenis = (window as any).__lenis
    if (lenis) {
      lenis.stop()
    }

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    document.documentElement.classList.add('modal-open')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
      if (lenis) {
        lenis.start()
      }
    }
  }, [citation, onClose])

  useEffect(() => {
    let currentUrl: string | null = null
    let isCancelled = false

    if (citation?.memoryId && citation?.fileId) {
      setIsLoadingBlob(true)
      setBlobError(null)

      fetchFileBlob(citation.memoryId, citation.fileId)
        .then((res) => {
          if (!isCancelled) {
            currentUrl = res.url
            setBlobUrl(res.url)
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setBlobError('Could not load media preview. You can still inspect the extracted chunk.')
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingBlob(false)
          }
        })
    } else {
      setBlobUrl(null)
      setIsLoadingBlob(false)
    }

    return () => {
      isCancelled = true
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [citation?.memoryId, citation?.fileId])

  useEffect(() => {
    // If start timestamp is present, set initial seek time on media elements
    const startSec = citation?.startTime ?? citation?.startTimestamp
    if (startSec !== undefined && startSec !== null && Number(startSec) > 0) {
      if (audioRef.current) {
        audioRef.current.currentTime = Number(startSec)
      }
      if (videoRef.current) {
        videoRef.current.currentTime = Number(startSec)
      }
    }
  }, [blobUrl, citation?.startTime, citation?.startTimestamp])

  if (!citation) return null

  const rawPage = citation.page ?? citation.pageNumber
  const rawStart = citation.startTime ?? citation.startTimestamp
  const rawEnd = citation.endTime ?? citation.endTimestamp
  const mimeType = citation.mimeType || ''
  const filename = citation.filename || citation.documentName || 'Document'

  const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)
  const isAudio = mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(filename)
  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(filename)
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(filename)

  const numPage = typeof rawPage === 'number' ? rawPage : rawPage != null ? Number(rawPage) : null
  const hasPage = !isImage && !isAudio && !isVideo && numPage !== null && !isNaN(numPage) && numPage > 0

  const numStart = typeof rawStart === 'number' ? rawStart : rawStart != null ? Number(rawStart) : null
  const numEnd = typeof rawEnd === 'number' ? rawEnd : rawEnd != null ? Number(rawEnd) : null
  const hasTimestamp = (isAudio || isVideo) && (
    (numStart !== null && !isNaN(numStart) && numStart > 0) ||
    (numEnd !== null && !isNaN(numEnd) && numEnd > 0)
  )

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(citation.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {}
  }

  const handleDownloadBlob = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatTimestamp = (sec?: number | null) => {
    if (sec === undefined || sec === null || isNaN(sec)) return null
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const modalContent = (
    <div
      onClick={onClose}
      data-lenis-prevent="true"
      className={`fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent="true"
        className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in zoom-in-95 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none rounded-none'
            : 'max-w-5xl lg:max-w-6xl w-full h-[94vh] rounded-2xl border border-slate-200/90'
        }`}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              {isVideo ? (
                <Video className="w-4 h-4" />
              ) : isAudio ? (
                <Music className="w-4 h-4" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : isPdf ? (
                <FileText className="w-4 h-4" />
              ) : (
                <FileCode className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{filename}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100/70 text-indigo-700">
                  {Math.round((citation.relevanceScore ?? citation.similarity) * 100)}% Match
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-600">Chunk #{citation.chunkIndex + 1}</span>
                {hasPage && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/90">
                      Page {numPage}
                    </span>
                  </>
                )}
                {hasTimestamp && numStart !== null && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/90">
                      Timestamp: {formatTimestamp(numStart)}
                      {numEnd !== null && numEnd > numStart ? ` - ${formatTimestamp(numEnd)}` : ''}
                    </span>
                  </>
                )}
                {citation.contentType && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="capitalize text-slate-600 font-medium">
                      {citation.contentType.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {blobUrl && (
              <button
                onClick={handleDownloadBlob}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Download original file securely"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleCopyText}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Copy retrieved text"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Restore view' : 'Maximize full screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-100 bg-slate-50/70 text-xs shrink-0 font-medium">
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>In-App Media Viewer</span>
          </button>

          <button
            onClick={() => setActiveTab('chunk')}
            className={`px-3 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chunk'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Retrieved Evidence Passage</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-3 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'metadata'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Citation Metadata</span>
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div
          data-lenis-prevent="true"
          className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/30"
        >
          {activeTab === 'media' && (
            <div className="space-y-4">
              {isLoadingBlob && (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">
                    Loading media directly into secure browser viewer...
                  </p>
                </div>
              )}

              {blobError && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{blobError}</p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Check the "Retrieved Evidence Passage" tab to view all extracted text and information.
                    </p>
                  </div>
                </div>
              )}

              {blobUrl && (
                <div>
                  {/* Image Viewer - Modern Light Theme */}
                  {isImage && (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <div className="p-2 bg-white rounded-xl border border-slate-200/90 shadow-sm max-h-[60vh] flex items-center justify-center">
                        <img
                          src={blobUrl}
                          alt={filename}
                          className="max-h-[56vh] object-contain rounded-lg"
                        />
                      </div>
                      <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 shadow-2xs">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold text-slate-800">{filename}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-mono text-[11px]">{mimeType}</span>
                      </div>
                    </div>
                  )}

                  {/* Audio Player - Modern Light Theme */}
                  {isAudio && (
                    <div className="p-6 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-100 rounded-2xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{filename}</h4>
                            <p className="text-xs text-indigo-600 font-medium">
                              Authenticated audio stream • Grounded segment
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          {mimeType}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                        <audio
                          ref={audioRef}
                          controls
                          src={blobUrl}
                          className="w-full"
                        />
                      </div>

                      {hasTimestamp && numStart !== null && (
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-slate-600">
                            Target passage starts at <strong className="text-indigo-600 font-bold">{formatTimestamp(numStart)}</strong>
                          </div>
                          <button
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.currentTime = numStart
                                audioRef.current.play()
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Seek to Cited Audio ({formatTimestamp(numStart)})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Player - Modern Light Theme */}
                  {isVideo && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-xs flex flex-col items-center">
                      <div className="w-full p-2 bg-slate-100/80 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          controls
                          src={blobUrl}
                          className="max-h-[58vh] w-full rounded-xl shadow-xs"
                        />
                      </div>

                      <div className="w-full p-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-semibold text-slate-800">{filename}</span>
                          {hasTimestamp && numStart !== null && (
                            <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-bold">
                              Segment: {formatTimestamp(numStart)}
                            </span>
                          )}
                        </div>

                        {hasTimestamp && numStart !== null && (
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = numStart
                                videoRef.current.play()
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Jump to Timestamp ({formatTimestamp(numStart)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PDF / Document In-App Embed */}
                  {isPdf && (
                    <div className="space-y-3">
                      <div className="h-[65vh] w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                        <iframe
                          src={`${blobUrl}${numPage ? `#page=${numPage}` : ''}`}
                          title={filename}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex items-center justify-between px-2 text-xs text-slate-500">
                        <span>
                          {numPage ? `Viewing Page ${numPage}` : 'In-browser PDF stream'}
                        </span>
                        <button
                          onClick={handleDownloadBlob}
                          className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fallback for DOCX / CSV / Text documents */}
                  {!isImage && !isAudio && !isVideo && !isPdf && (
                    <div className="p-5 bg-white rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Document Text Preview</span>
                        <span className="text-[11px] text-slate-400 font-mono">{mimeType}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                        {citation.content}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accompanying Passage Text under media */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cited Evidence Passage</span>
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                    {Math.round((citation.relevanceScore ?? citation.similarity) * 100)}% Match
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                  {citation.content}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'chunk' && (
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Exact Vector Retrieval Passage
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-semibold"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Passage'}</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                  {citation.content}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 text-xs shadow-2xs">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Document Name</span>
                  <span className="font-bold text-slate-900 truncate max-w-[280px]">
                    {filename}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">MIME Type</span>
                  <span className="font-mono text-slate-900">{mimeType || 'unknown'}</span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Relevance Score</span>
                  <span className="font-bold text-indigo-600">
                    {Math.round((citation.relevanceScore ?? citation.similarity) * 100)}%
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Document Page</span>
                  <span className="text-slate-900">{hasPage ? `Page ${numPage}` : 'N/A (Non-paged media)'}</span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Media Timestamp</span>
                  <span className="text-slate-900">
                    {hasTimestamp && numStart !== null
                      ? `${formatTimestamp(numStart)}${numEnd ? ` - ${formatTimestamp(numEnd)}` : ''}`
                      : 'N/A (Static media / document)'}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Modality Concept</span>
                  <span className="capitalize text-slate-900">
                    {citation.contentType?.replace(/_/g, ' ') || 'Document Text'}
                  </span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Chunk Identifier</span>
                  <span className="font-mono text-slate-500 text-[10px]">{citation.id}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Secure in-app sandbox preview (zero exposed server links)</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="px-3 py-1.5 font-medium text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              {isFullscreen ? 'Exit Full Screen' : 'Expand Full Screen'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
