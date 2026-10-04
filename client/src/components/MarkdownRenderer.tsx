import React from 'react'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 text-indigo-700 rounded border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  const flushList = (keyPrefix: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="my-2 space-y-1 pl-5 list-disc text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderFormattedText(item)}
            </li>
          ))}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto"
          >
            <pre>{codeBlockLines.join('\n')}</pre>
          </div>,
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        flushList(index)
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      return
    }

    if (trimmed.startsWith('### ')) {
      flushList(index)
      elements.push(
        <h4 key={index} className="text-sm font-bold text-slate-900 mt-3 mb-1">
          {renderFormattedText(trimmed.replace(/^###\s+/, ''))}
        </h4>,
      )
      return
    }

    if (trimmed.startsWith('## ')) {
      flushList(index)
      elements.push(
        <h3 key={index} className="text-base font-bold text-slate-900 mt-4 mb-1.5">
          {renderFormattedText(trimmed.replace(/^##\s+/, ''))}
        </h3>,
      )
      return
    }

    if (trimmed.startsWith('# ')) {
      flushList(index)
      elements.push(
        <h2 key={index} className="text-lg font-bold text-slate-900 mt-4 mb-2">
          {renderFormattedText(trimmed.replace(/^#\s+/, ''))}
        </h2>,
      )
      return
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      listItems.push(trimmed.replace(/^[-*•]\s+/, ''))
      return
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      return
    }

    flushList(index)

    if (trimmed.length === 0) {
      elements.push(<div key={index} className="h-2" />)
      return
    }

    elements.push(
      <p key={index} className="text-slate-800 leading-relaxed text-sm my-1">
        {renderFormattedText(line)}
      </p>,
    )
  })

  flushList(lines.length)

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <div
        key={`code-end`}
        className="my-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto"
      >
        <pre>{codeBlockLines.join('\n')}</pre>
      </div>,
    )
  }

  return <div className="space-y-1">{elements}</div>
}
