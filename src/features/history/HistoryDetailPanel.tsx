import React, { useState } from 'react'
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

export const HistoryDetailPanel: React.FC<HistoryDetailPanelProps> = ({
  log,
  onClose,
  onReload,
}) => {
  const [copied, setCopied] = useState(false)
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Panel Header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <div>
            <span className="text-[9px] font-bold tracking-wider text-indigo-400 uppercase font-mono">
              {log.workspaceId} &gt; {log.toolId.replace('-', ' ')}
            </span>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 mt-0.5">
              Activity Log Details
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReload(log)}
              className="py-1.5 px-3 rounded-lg bg-indigo-650 hover:bg-indigo-650/80 text-white text-xs font-semibold flex items-center gap-1 transition-all"
            >
              Reload Inputs <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Content (Side-by-side or scrollable grid) */}
        <div className="flex-1 p-5 overflow-y-auto grid md:grid-cols-2 gap-5 min-h-0">
          {/* Left Column: Inputs */}
          <div className="flex flex-col space-y-4 h-full min-h-[300px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-1 flex-shrink-0">
              Prompt Input Payload
            </h4>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {isCareer ? (
                <>
                  {careerInputWarning && (
                    <div className="p-3 rounded-lg border border-amber-900/30 bg-amber-950/15 text-[11px] leading-relaxed text-amber-300">
                      {careerInputWarning}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">1. Candidate Resume / CV</label>
                    <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-850/50 text-xs text-zinc-300 font-mono whitespace-pre-wrap select-text h-48 overflow-y-auto">
                      {careerResume || <span className="text-zinc-600 italic">Empty resume text</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">2. Target Job Description</label>
                    <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-850/50 text-xs text-zinc-300 whitespace-pre-wrap select-text h-48 overflow-y-auto">
                      {careerJobDesc || <span className="text-zinc-600 italic">Empty job description text</span>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1 h-full flex flex-col">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase flex-shrink-0">Input Text</label>
                  <div className="flex-1 p-3 rounded-lg bg-zinc-950/60 border border-zinc-850/50 text-xs text-zinc-300 whitespace-pre-wrap select-text overflow-y-auto">
                    {grammarInput || <span className="text-zinc-600 italic">Empty input text</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Generated Output */}
          <div className="flex flex-col space-y-4 h-full min-h-[300px]">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-1 flex-shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Generated Response Output
              </h4>
              <button
                onClick={handleCopy}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 py-1 px-2 rounded hover:bg-zinc-900 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Response'}
              </button>
            </div>

            <div className="flex-1 p-4 rounded-lg bg-zinc-950/40 border border-zinc-850/50 text-xs text-zinc-200 whitespace-pre-wrap select-text overflow-y-auto font-sans leading-relaxed">
              {log.output}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-900/10 text-[10px] text-zinc-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 flex-shrink-0">
          <span>Metadata: Model = <span className="font-mono">{log.model}</span> | Provider = <span className="font-mono">{log.provider}</span></span>
          <span className="font-mono">Logged at: {dateStr}</span>
        </div>
      </div>
    </div>
  )
}
