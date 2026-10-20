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
    <header className="app-header theme-panel sticky top-0 z-10 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-h-16 items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 mr-2">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="theme-icon-button mr-1 rounded-md p-1 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-wide theme-text-strong">{title}</h1>
            {subtitle ? <p className="truncate text-[11px] theme-text-muted">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-xs">
          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-icon-button rounded-lg p-2"
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
            className="theme-button-secondary inline-flex items-center gap-2 rounded-full p-2 sm:px-3 sm:py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
            aria-haspopup="dialog"
            aria-expanded={isCommandPaletteOpen}
            aria-label="Open command palette"
          >
            <Command className="h-3.5 w-3.5 theme-text-faint" />
            <span className="hidden sm:inline">Command palette</span>
            <span className="hidden md:inline-block rounded border px-1.5 py-0.5 text-[9px] tracking-[0.12em] theme-chip">⌘K</span>
          </button>

          <div
            title={privacyMode ? 'Local-only' : 'Cloud enabled'}
            className={`status-pill inline-flex items-center gap-1.5 rounded-full p-2 sm:px-3 sm:py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${privacyMode ? 'status-pill-success' : ''}`}
          >
            <Shield className={`h-3.5 w-3.5 ${privacyMode ? 'theme-success-text' : 'theme-text-faint'}`} />
            <span className="hidden sm:inline">{privacyMode ? 'Local-only' : 'Cloud enabled'}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zinc-500/20 py-2 text-[11px] theme-text-muted" aria-label="Release information">
        <span className="font-medium theme-text-strong">0.1.0-alpha.1 · Early alpha</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="underline underline-offset-4 hover:opacity-80" href={`${import.meta.env.BASE_URL}privacy.html#limitations`}>Known limitations</a>
          <a className="underline underline-offset-4 hover:opacity-80" href="https://github.com/italomlp/omnibox-ai/issues" target="_blank" rel="noopener noreferrer">Send feedback</a>
        </div>
      </div>
    </header>
  )
}
