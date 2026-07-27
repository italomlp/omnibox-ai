import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { LocalGrammarDiagnostic } from './harperGrammar'
import { buildDiagnosticSegments, getCurrentDiagnostics } from './harperDiagnosticSegments'
import {
  getDiagnosticPopoverPosition,
  getTextareaRangePosition,
  POPOVER_INSET,
  type DiagnosticPopoverPosition,
} from './harperDiagnosticPositioning'

export interface HarperDiagnosticEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'onChange' | 'value'> {
  value: string
  diagnostics: LocalGrammarDiagnostic[]
  diagnosticStatus?: 'idle' | 'checking' | 'ready' | 'unavailable'
  diagnosticMessage?: string | null
  onChange: (value: string) => void
  onApplySuggestion?: (diagnostic: LocalGrammarDiagnostic, suggestionIndex: number) => void
}

const getDiagnosticKey = (diagnostic: LocalGrammarDiagnostic): string => {
  const { start, end } = diagnostic.range
  return `${start}:${end}:${diagnostic.message}`
}

const getDiagnosticAtSelection = (
  diagnostics: LocalGrammarDiagnostic[],
  selectionStart: number,
  selectionEnd: number,
): LocalGrammarDiagnostic | undefined => diagnostics.find((diagnostic) => {
  const { start, end } = diagnostic.range
  return selectionStart === selectionEnd
    ? start <= selectionStart && selectionStart <= end
    : start < selectionEnd && selectionStart < end
})

export const HarperDiagnosticEditor: React.FC<HarperDiagnosticEditorProps> = ({
  value,
  diagnostics,
  diagnosticStatus = 'ready',
  diagnosticMessage,
  onChange,
  onApplySuggestion,
  className,
  id,
  onScroll,
  onFocus,
  onClick,
  onSelect,
  onKeyDown,
  onKeyUp,
  ...textareaProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const highlightContentRef = useRef<HTMLDivElement>(null)
  const activeMarkRef = useRef<HTMLElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const issuesPanelRef = useRef<HTMLElement>(null)
  const issueRefs = useRef(new Map<string, HTMLLIElement>())
  const [announcement, setAnnouncement] = useState('')
  const [activeDiagnosticKey, setActiveDiagnosticKey] = useState<string>()
  const [diagnosticToRevealKey, setDiagnosticToRevealKey] = useState<string>()
  const [popoverPosition, setPopoverPosition] = useState<DiagnosticPopoverPosition>()
  const activeDiagnostics = useMemo(
    () => getCurrentDiagnostics(diagnostics, value),
    [diagnostics, value],
  )
  const segments = useMemo(() => buildDiagnosticSegments(value, activeDiagnostics), [activeDiagnostics, value])
  const textareaId = id ?? 'harper-diagnostic-editor'
  const statusId = `${textareaId}-status`
  const issueListId = `${textareaId}-issues`
  const diagnosticAnnouncement = activeDiagnostics.length === 0
    ? 'No current grammar issues.'
    : `${activeDiagnostics.length} grammar issue${activeDiagnostics.length === 1 ? '' : 's'} available.`

  const activeDiagnostic = activeDiagnostics.find(
    (diagnostic) => getDiagnosticKey(diagnostic) === activeDiagnosticKey,
  )

  useEffect(() => {
    if (activeDiagnosticKey && !activeDiagnostic) {
      setActiveDiagnosticKey(undefined)
      setAnnouncement('The selected grammar issue is no longer current.')
    }
  }, [activeDiagnostic, activeDiagnosticKey])

  useEffect(() => {
    if (!activeDiagnosticKey) return
    issueRefs.current.get(activeDiagnosticKey)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeDiagnosticKey])

  useEffect(() => {
    if (!activeDiagnosticKey) return

    const dismissOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (
        editorRef.current?.contains(target)
        || popoverRef.current?.contains(target)
        || issuesPanelRef.current?.contains(target)
      ) return

      setActiveDiagnosticKey(undefined)
      setDiagnosticToRevealKey(undefined)
      setAnnouncement('Grammar issue details dismissed.')
    }

    document.addEventListener('pointerdown', dismissOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointerDown)
  }, [activeDiagnosticKey])

  const updatePopoverPosition = useCallback(() => {
    const editor = editorRef.current
    const popover = popoverRef.current
    if (!editor || !popover) return

    setPopoverPosition(getDiagnosticPopoverPosition(
      activeMarkRef.current?.getBoundingClientRect(),
      editor.getBoundingClientRect(),
      popover.getBoundingClientRect(),
    ))
  }, [])

  useLayoutEffect(() => {
    if (!activeDiagnostic) {
      setPopoverPosition(undefined)
      return
    }

    updatePopoverPosition()
    const editor = editorRef.current
    const activeMark = activeMarkRef.current
    if (!editor) return

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(updatePopoverPosition)
    resizeObserver?.observe(editor)
    if (activeMark) resizeObserver?.observe(activeMark)

    const visualViewport = window.visualViewport
    editor.addEventListener('scroll', updatePopoverPosition)
    window.addEventListener('resize', updatePopoverPosition)
    visualViewport?.addEventListener('resize', updatePopoverPosition)
    visualViewport?.addEventListener('scroll', updatePopoverPosition)

    return () => {
      resizeObserver?.disconnect()
      editor.removeEventListener('scroll', updatePopoverPosition)
      window.removeEventListener('resize', updatePopoverPosition)
      visualViewport?.removeEventListener('resize', updatePopoverPosition)
      visualViewport?.removeEventListener('scroll', updatePopoverPosition)
    }
  }, [activeDiagnostic, updatePopoverPosition, value])

  const syncScroll = useCallback((textarea: HTMLTextAreaElement) => {
    const highlightContent = highlightContentRef.current
    if (highlightContent) {
      highlightContent.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
    }
  }, [])

  const revealDiagnosticRange = useCallback((diagnostic: LocalGrammarDiagnostic) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const rangePosition = getTextareaRangePosition({
      value,
      range: diagnostic.range,
      textareaRect: textarea.getBoundingClientRect(),
      rangeRect: activeMarkRef.current?.getBoundingClientRect(),
      scrollTop: textarea.scrollTop,
      scrollLeft: textarea.scrollLeft,
      scrollHeight: textarea.scrollHeight,
      scrollWidth: textarea.scrollWidth,
      clientHeight: textarea.clientHeight,
      clientWidth: textarea.clientWidth,
      clientTop: textarea.clientTop,
      clientLeft: textarea.clientLeft,
    })
    if (!rangePosition) return

    textarea.scrollTop = rangePosition.top
    textarea.scrollLeft = rangePosition.left
    syncScroll(textarea)
    updatePopoverPosition()
  }, [syncScroll, updatePopoverPosition, value])

  useLayoutEffect(() => {
    if (!diagnosticToRevealKey || diagnosticToRevealKey !== activeDiagnosticKey || !activeDiagnostic) return

    revealDiagnosticRange(activeDiagnostic)
    setDiagnosticToRevealKey(undefined)
  }, [activeDiagnostic, activeDiagnosticKey, diagnosticToRevealKey, revealDiagnosticRange])

  const activateDiagnosticAtSelection = useCallback((textarea: HTMLTextAreaElement) => {
    const diagnostic = getDiagnosticAtSelection(
      activeDiagnostics,
      textarea.selectionStart,
      textarea.selectionEnd,
    )
    setActiveDiagnosticKey(diagnostic ? getDiagnosticKey(diagnostic) : undefined)
  }, [activeDiagnostics])

  const focusDiagnostic = (diagnostic: LocalGrammarDiagnostic, index: number) => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    textarea.setSelectionRange(diagnostic.range.start, diagnostic.range.end)
    const diagnosticKey = getDiagnosticKey(diagnostic)
    setActiveDiagnosticKey(diagnosticKey)
    setDiagnosticToRevealKey(diagnosticKey)
    setAnnouncement(`Selected issue ${index + 1} of ${activeDiagnostics.length}: ${diagnostic.message}`)
  }

  return (
    <section className="harper-diagnostic-workspace" aria-label="Local grammar editor">
      <div ref={editorRef} className="harper-diagnostic-editor relative min-h-[220px] min-w-0 w-full overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/60">
        <div className="harper-diagnostic-highlight-layer" aria-hidden="true">
          <div ref={highlightContentRef} className="harper-diagnostic-highlight-content">
            {segments.map((segment, index) => segment.diagnostic ? (
              <mark
                key={`${segment.diagnostic.id}:${index}`}
                ref={getDiagnosticKey(segment.diagnostic) === activeDiagnosticKey ? activeMarkRef : undefined}
                className="harper-diagnostic-mark"
              >
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
          onFocus={(event) => {
            activateDiagnosticAtSelection(event.currentTarget)
            onFocus?.(event)
          }}
          onClick={(event) => {
            activateDiagnosticAtSelection(event.currentTarget)
            onClick?.(event)
          }}
          onSelect={(event) => {
            activateDiagnosticAtSelection(event.currentTarget)
            onSelect?.(event)
          }}
          onKeyUp={(event) => {
            onKeyUp?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.setSelectionRange(event.currentTarget.selectionEnd, event.currentTarget.selectionEnd)
              setActiveDiagnosticKey(undefined)
              setDiagnosticToRevealKey(undefined)
              setAnnouncement('Grammar issue details dismissed.')
            }
            onKeyDown?.(event)
          }}
          onScroll={(event) => {
            syncScroll(event.currentTarget)
            updatePopoverPosition()
            onScroll?.(event)
          }}
          aria-describedby={`${statusId} ${issueListId}`}
          className={`harper-diagnostic-textarea glass-input control-touch relative z-10 min-h-[220px] w-full resize-y rounded-lg border-0 bg-transparent p-4 text-sm ${className ?? ''}`}
        />
        {activeDiagnostic && (
          <div
            ref={popoverRef}
            role="region"
            aria-label="Active grammar issue"
            data-placement={popoverPosition?.placement ?? 'fallback'}
            className="harper-diagnostic-popover layer-popover40"
            style={{
              left: `${popoverPosition?.left ?? POPOVER_INSET}px`,
              top: `${popoverPosition?.top ?? POPOVER_INSET}px`,
            }}
          >
            <p className="text-xs leading-relaxed text-zinc-100">{activeDiagnostic.message}</p>
            {activeDiagnostic.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggestions">
                {activeDiagnostic.suggestions.map((suggestion, suggestionIndex) => (
                  <button
                    key={`${activeDiagnostic.id}:${suggestion.replacement}:${suggestionIndex}`}
                    type="button"
                    onClick={() => onApplySuggestion?.(activeDiagnostic, suggestionIndex)}
                    disabled={!onApplySuggestion}
                    className="button-secondary control-compact text-xs text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Apply suggestion: ${suggestion.replacement}`}
                  >
                    Apply “{suggestion.replacement}”
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement || diagnosticAnnouncement}
      </p>

      <aside ref={issuesPanelRef} id={issueListId} className="harper-diagnostic-issues-panel" aria-label="Grammar issues">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800/70 pb-3">
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Issues</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Select an issue to focus it in the editor.</p>
          </div>
          {diagnosticStatus === 'ready' && activeDiagnostics.length > 0 && (
            <span className="shrink-0 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-[10px] font-semibold text-emerald-300">
              {activeDiagnostics.length}
            </span>
          )}
        </div>

        <div className="harper-diagnostic-issues-content" aria-busy={diagnosticStatus === 'checking'}>
          {diagnosticStatus === 'checking' ? (
            <p className="flex items-center gap-2 text-xs text-zinc-400" role="status">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
              Checking locally…
            </p>
          ) : diagnosticStatus === 'unavailable' ? (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-300" role="alert">
              Local grammar diagnostics are unavailable.{diagnosticMessage ? ` ${diagnosticMessage}` : ''}
            </p>
          ) : diagnosticStatus === 'idle' ? (
            <p className="text-xs leading-relaxed text-zinc-500">Type or paste text to begin local grammar checking.</p>
          ) : activeDiagnostics.length === 0 ? (
            <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs leading-relaxed text-emerald-300" role="status">No grammar issues found.</p>
          ) : (
            <ul className="space-y-2">
            {activeDiagnostics.map((diagnostic, index) => {
              const diagnosticKey = getDiagnosticKey(diagnostic)
              const isActive = diagnosticKey === activeDiagnosticKey
              return (
                <li
                  key={diagnosticKey}
                  ref={(element) => {
                    if (element) issueRefs.current.set(diagnosticKey, element)
                    else issueRefs.current.delete(diagnosticKey)
                  }}
                  className={`rounded-lg border bg-zinc-950/30 p-3 ${isActive ? 'border-emerald-400 ring-1 ring-emerald-400/70' : 'border-zinc-800'}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs leading-relaxed text-zinc-200">{diagnostic.message}</p>
                      {isActive && <p className="text-xs font-medium text-emerald-300">Active issue</p>}
                    </div>
                    <div className="harper-diagnostic-issue-actions flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-2" role="group" aria-label={`Actions for issue ${index + 1}`}>
                     <button
                      type="button"
                      onClick={() => focusDiagnostic(diagnostic, index)}
                      className="button-secondary control-standard shrink-0 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                      aria-label={`Select issue ${index + 1}: ${diagnostic.message}`}
                    >
                      Select issue
                    </button>
                    {diagnostic.suggestions.map((suggestion, suggestionIndex) => (
                      <button
                        key={`${diagnostic.id}:${suggestion.replacement}:${suggestionIndex}`}
                        type="button"
                        onClick={() => onApplySuggestion?.(diagnostic, suggestionIndex)}
                        disabled={!onApplySuggestion}
                        className="button-secondary control-standard shrink-0 text-xs text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Apply suggestion: ${suggestion.replacement}`}
                      >
                        Apply “{suggestion.replacement}”
                      </button>
                    ))}
                    </div>
                  </div>
                </li>
              )
            })}
            </ul>
          )}
        </div>
      </aside>
    </section>
  )
}
