import React from 'react'
import { Command, Menu, MoonStar, Shield, SunMedium } from 'lucide-react'

interface AppHeaderProps {
  title: string
  subtitle?: string
  privacyMode: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
  isCommandPaletteOpen: boolean
  onOpenCommandPalette: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  privacyMode,
  sidebarOpen,
  onToggleSidebar,
  isCommandPaletteOpen,
  onOpenCommandPalette,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="app-header sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-900/60 bg-zinc-950/45 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="theme-icon-button mr-1 rounded-md p-1 text-zinc-400 transition-all hover:bg-zinc-900/60 hover:text-zinc-200 md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-wide text-zinc-100">{title}</h1>
          {subtitle ? <p className="truncate text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 text-xs">
        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-icon-button rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-zinc-200"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <SunMedium className="h-4 w-4 text-amber-400" />
          ) : (
            <MoonStar className="h-4 w-4 text-indigo-400" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          aria-haspopup="dialog"
          aria-expanded={isCommandPaletteOpen}
          aria-label="Open command palette"
        >
          <Command className="h-3.5 w-3.5 text-zinc-500" />
          Command palette
          <span className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-zinc-500">⌘K</span>
        </button>

        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${privacyMode ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}>
          <Shield className={`h-3 w-3 ${privacyMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
          {privacyMode ? 'Local-only' : 'Cloud enabled'}
        </div>
      </div>
    </header>
  )
}
