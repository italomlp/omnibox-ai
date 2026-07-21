import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Command, Search, X } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import { buildCommandPaletteSections, type CommandPaletteItem, type CommandPaletteSection } from './commandPaletteData'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (route: RouteDescriptor) => void
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate }) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const sections = useMemo<CommandPaletteSection[]>(() => buildCommandPaletteSections(query), [query])
  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  )

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuery('')
    setActiveIndex(0)

    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      const restoreTarget = previousFocusRef.current
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus()
      }
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(items.length > 0 ? 0 : -1)
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length, query])

  useEffect(() => {
    if (activeIndex < 0) return

    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelect = (item: CommandPaletteItem) => {
    onNavigate(item.route)
    onClose()
  }

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const nodes = focusables ? Array.from(focusables).filter((element) => !element.hasAttribute('disabled')) : []

      if (nodes.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
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
      return
    }

    if (event.target !== searchInputRef.current) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length === 0) return

      setActiveIndex((current) => {
        if (current < 0) return event.key === 'ArrowDown' ? 0 : items.length - 1
        return event.key === 'ArrowDown'
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length
      })
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault()
      handleSelect(items[activeIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        aria-describedby="command-palette-description"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-900/80 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              <Command className="h-3.5 w-3.5" /> Command palette
            </div>
            <h2 id="command-palette-title" className="mt-2 text-sm font-semibold text-zinc-100">Search destinations and tools</h2>
            <p id="command-palette-description" className="mt-1 text-xs leading-5 text-zinc-500">
              Use ↑ ↓ to move, Enter to open, Escape to close, and Tab to stay inside this dialog.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="theme-icon-button rounded-lg p-2 text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-900/80 px-4 py-4 sm:px-5">
          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 focus-within:border-indigo-700/60 focus-within:ring-2 focus-within:ring-indigo-500/40">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="sr-only">Search destinations and tools</span>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to search"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-3">
          {items.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <section key={section.id} className="space-y-2">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {section.title}
                  </div>

                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const itemIndex = items.findIndex((candidate) => candidate.id === item.id)
                      const isActive = itemIndex === activeIndex

                      return (
                        <button
                          key={item.id}
                          ref={(node) => { itemRefs.current[itemIndex] = node }}
                          type="button"
                          onClick={() => handleSelect(item)}
                          aria-selected={isActive}
                          className={`flex w-full items-start justify-between gap-4 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive ? 'border-indigo-700/70 bg-indigo-950/30' : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/70'}`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="truncate text-sm font-medium text-zinc-100">{item.title}</div>
                            <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{item.description}</p>
                          </div>

                          <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {item.groupTitle}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/50 px-6 py-10 text-center">
              <div className="max-w-sm space-y-2">
                <div className="text-sm font-medium text-zinc-100">No matches found</div>
                <p className="text-sm leading-6 text-zinc-500">
                  Try a different tool name, category, or destination.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-900/80 px-4 py-3 text-xs text-zinc-500 sm:px-5">
          <div className="truncate">Open destinations, browse tools, or jump straight into a tool route.</div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">Enter</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
