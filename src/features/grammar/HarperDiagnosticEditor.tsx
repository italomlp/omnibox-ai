import React, { useMemo, useRef, useState } from 'react'

import type { LocalGrammarDiagnostic } from './harperGrammar'
import { buildDiagnosticSegments, getCurrentDiagnostics } from './harperDiagnosticSegments'

export interface HarperDiagnosticEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'onChange' | 'value'> {
  value: string
  diagnostics: LocalGrammarDiagnostic[]
  onChange: (value: string) => void
  onApplySuggestion?: (diagnostic: LocalGrammarDiagnostic, suggestionIndex: number) => void
}

export const HarperDiagnosticEditor: React.FC<HarperDiagnosticEditorProps> = ({
  value,
  diagnostics,
  onChange,
  onApplySuggestion,
  className,
  id,
  onScroll,
  ...textareaProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightContentRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const activeDiagnostics = useMemo(
    () => getCurrentDiagnostics(diagnostics, value),
    [diagnostics, value],
  )
  const segments = useMemo(() => buildDiagnosticSegments(value, activeDiagnostics), [activeDiagnostics, value])
  const textareaId = id ?? 'harper-diagnostic-editor'
  const statusId = `${textareaId}-status`
  const issueListId = `${textareaId}-issues`
  const diagnosticStatus = activeDiagnostics.length === 0
    ? 'No current grammar issues.'
    : `${activeDiagnostics.length} grammar issue${activeDiagnostics.length === 1 ? '' : 's'} available.`

  const syncScroll = (textarea: HTMLTextAreaElement) => {
    const highlightContent = highlightContentRef.current
    if (highlightContent) {
      highlightContent.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
    }
  }

  const focusDiagnostic = (diagnostic: LocalGrammarDiagnostic, index: number) => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    textarea.setSelectionRange(diagnostic.range.start, diagnostic.range.end)
    setAnnouncement(`Selected issue ${index + 1} of ${activeDiagnostics.length}: ${diagnostic.message}`)
  }

  return (
    <section className="min-w-0 space-y-3" aria-label="Local grammar editor">
      <div className="harper-diagnostic-editor relative min-h-[220px] w-full overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/60">
        <div className="harper-diagnostic-highlight-layer" aria-hidden="true">
          <div ref={highlightContentRef} className="harper-diagnostic-highlight-content">
            {segments.map((segment, index) => segment.diagnostic ? (
              <mark key={`${segment.diagnostic.id}:${index}`} className="harper-diagnostic-mark">
                {segment.text}
              </mark>
            ) : (
              <React.Fragment key={`text:${index}`}>{segment.text}</React.Fragment>
            ))}
            {'\n'}
          </div>
        </div>
        <textarea
          {...textareaProps}
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            syncScroll(event.currentTarget)
            onScroll?.(event)
          }}
          aria-describedby={`${statusId} ${issueListId}`}
          className={`harper-diagnostic-textarea glass-input control-touch relative z-10 min-h-[220px] w-full resize-y rounded-lg border-0 bg-transparent p-4 text-sm ${className ?? ''}`}
        />
      </div>

      <p id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement || diagnosticStatus}
      </p>

      <div id={issueListId} className="space-y-2" aria-label="Grammar issues">
        {activeDiagnostics.length === 0 ? (
          <p className="text-xs text-zinc-500">No current grammar issues to navigate.</p>
        ) : (
          <ul className="space-y-2">
            {activeDiagnostics.map((diagnostic, index) => (
              <li key={diagnostic.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-xs leading-relaxed text-zinc-200">{diagnostic.message}</p>
                  <button
                    type="button"
                    onClick={() => focusDiagnostic(diagnostic, index)}
                    className="button-secondary control-standard shrink-0 text-xs"
                    aria-label={`Select issue ${index + 1}: ${diagnostic.message}`}
                  >
                    Select issue
                  </button>
                </div>
                {diagnostic.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {diagnostic.suggestions.map((suggestion, suggestionIndex) => (
                      <button
                        key={`${diagnostic.id}:${suggestion.replacement}:${suggestionIndex}`}
                        type="button"
                        onClick={() => onApplySuggestion?.(diagnostic, suggestionIndex)}
                        disabled={!onApplySuggestion}
                        className="button-secondary control-standard text-xs text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Apply suggestion: ${suggestion.replacement}`}
                      >
                        Apply “{suggestion.replacement}”
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
