import React, { useEffect, useRef, useState } from 'react'
import { X, Copy, Check, ArrowRight } from 'lucide-react'
import type { HistoryItem } from '../../db/db'

interface CareerInputPayload {
  resume: string;
  jobDesc: string;
  warning?: string;
}

const stringifyUnknownInput = (input: unknown): string => {
  if (typeof input === 'string') return input

  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return '[Unable to display legacy input payload]'
  }
}

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

const normalizeCareerInput = (input: unknown): CareerInputPayload => {
  const fallbackText = stringifyUnknownInput(input)
  const parsed = typeof input === 'string' ? parseJsonObject(input) : input

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      resume: fallbackText,
      jobDesc: '',
      warning: 'This legacy career entry has an input payload that could not be parsed. Showing the raw saved input instead.',
    }
  }

  const inputObj = parsed as Record<string, unknown>
  const resume = typeof inputObj.resume === 'string' ? inputObj.resume : ''
  const jobDesc = typeof inputObj.jobDesc === 'string' ? inputObj.jobDesc : ''

  if (!resume && !jobDesc) {
    return {
      resume: fallbackText,
      jobDesc: '',
      warning: 'This career entry uses an older input shape. Showing the saved payload as raw text.',
    }
  }

  return { resume, jobDesc }
}

interface HistoryDetailPanelProps {
  log: HistoryItem;
  onClose: () => void;
  onReload: (log: HistoryItem) => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export const HistoryDetailPanel: React.FC<HistoryDetailPanelProps> = ({
  log,
  onClose,
  onReload,
}) => {
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const isCareer = log.workspaceId === 'career'
  const dateStr = new Date(log.timestamp).toLocaleString()

  // Extract input details
  let grammarInput = ''
  let careerResume = ''
  let careerJobDesc = ''
  let careerInputWarning = ''

  if (isCareer) {
    const normalizedInput = normalizeCareerInput(log.input)
    careerResume = normalizedInput.resume
    careerJobDesc = normalizedInput.jobDesc
    careerInputWarning = normalizedInput.warning || ''
  } else {
    grammarInput = stringifyUnknownInput(log.input)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(log.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusInitialControl = () => {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const target = closeButtonRef.current ?? focusables?.[0] ?? dialogRef.current
      target?.focus()
    }

    const frame = window.requestAnimationFrame(focusInitialControl)

    return () => {
      window.cancelAnimationFrame(frame)
      const restoreTarget = previouslyFocusedRef.current
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus()
      }
    }
  }, [])

  const getFocusableElements = () => {
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    return focusables ? Array.from(focusables).filter((element) => !element.hasAttribute('disabled')) : []
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusables = getFocusableElements()
    if (focusables.length === 0) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        aria-describedby="history-detail-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Panel Header */}
        <div className="flex flex-col gap-3 border-b border-zinc-900 bg-zinc-900/20 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wider font-mono text-indigo-400">
              {log.workspaceId} &gt; {log.toolId.replace('-', ' ')}
            </span>
            <h3 id="history-detail-title" className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-zinc-100">
              Activity Log Details
            </h3>
            <p id="history-detail-description" className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              {dateStr} · {log.provider} · {log.model}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onReload(log)}
              className="button-primary control-standard w-full text-xs sm:w-auto"
              aria-label="Reload these inputs into the workspace"
            >
              Reload Inputs <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="button-icon text-zinc-400 hover:text-zinc-200"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Content (Side-by-side or scrollable grid) */}
        <div className="grid flex-1 min-h-0 gap-5 overflow-y-auto p-4 sm:p-5 md:grid-cols-2">
          {/* Left Column: Inputs */}
          <div className="flex min-h-[300px] min-w-0 flex-col space-y-4">
            <h4 className="shrink-0 border-b border-zinc-900 pb-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Prompt Input Payload
            </h4>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {isCareer ? (
                <>
                  {careerInputWarning && (
                    <div role="alert" className="rounded-lg border border-amber-900/30 bg-amber-950/15 p-3 text-[11px] leading-relaxed text-amber-300">
                      {careerInputWarning}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">1. Candidate Resume / CV</label>
                    <div className="surface-nested h-48 overflow-y-auto rounded-lg border border-zinc-800/60 p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words select-text">
                      {careerResume || <span className="text-zinc-600 italic">Empty resume text</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">2. Target Job Description</label>
                    <div className="surface-nested h-48 overflow-y-auto rounded-lg border border-zinc-800/60 p-3 text-xs text-zinc-300 whitespace-pre-wrap break-words select-text">
                      {careerJobDesc || <span className="text-zinc-600 italic">Empty job description text</span>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1 h-full flex flex-col">
                  <label className="shrink-0 text-[10px] text-zinc-500 font-bold uppercase">Input Text</label>
                  <div className="surface-nested flex-1 overflow-y-auto rounded-lg border border-zinc-800/60 p-3 text-xs text-zinc-300 whitespace-pre-wrap break-words select-text">
                    {grammarInput || <span className="text-zinc-600 italic">Empty input text</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Generated Output */}
          <div className="flex min-h-[300px] min-w-0 flex-col space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-1 shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Generated Response Output
              </h4>
              <button
                type="button"
                onClick={handleCopy}
                className="button-secondary control-standard text-[10px] text-zinc-400 hover:text-zinc-200"
                aria-label={copied ? 'Response copied' : 'Copy generated response'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Response'}
              </button>
            </div>

            <div className="surface-nested flex-1 overflow-y-auto rounded-lg border border-zinc-800/60 p-4 text-xs text-zinc-200 whitespace-pre-wrap break-words select-text font-sans leading-relaxed">
              {log.output}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="flex shrink-0 flex-col gap-1.5 border-t border-zinc-900 bg-zinc-900/10 p-3 text-[10px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 break-words">Metadata: Model = <span className="font-mono">{log.model}</span> | Provider = <span className="font-mono">{log.provider}</span></span>
          <span className="font-mono">Logged at: {dateStr}</span>
        </div>
      </div>
    </div>
  )
}
