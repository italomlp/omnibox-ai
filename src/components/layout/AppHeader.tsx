import React from 'react'
import { Globe, Menu, Shield, Sun, Moon } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'

interface AppHeaderProps {
  workspaceName: string;
  privacyMode: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  workspaceName,
  privacyMode,
  sidebarOpen,
  onToggleSidebar,
}) => {
  const ui = useUIStore()

  return (
    <header className="app-header flex h-16 items-center justify-between border-b border-zinc-900/60 px-4 md:px-6 backdrop-blur-md bg-zinc-950/45 sticky top-0 z-10">
      <div className="flex min-w-0 items-center gap-3">
        {/* Menu icon if sidebar collapses */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="theme-icon-button p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all mr-1 md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        <h1 className="min-w-0 truncate text-sm font-bold tracking-wider text-zinc-200 uppercase">
          {workspaceName}
        </h1>
      </div>

      {/* Global Indicators Bar */}
      <div className="flex items-center gap-3 md:gap-4 text-xs">
        {/* Light/Dark Mode Switcher */}
        <button
          onClick={ui.toggleTheme}
          className="theme-icon-button p-2 rounded-lg hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={`Switch to ${ui.theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${ui.theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {ui.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {privacyMode ? (
          <div className="status-pill status-pill-success flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 font-semibold tracking-wide text-[10px] uppercase shadow-[0_0_10px_rgba(16,185,129,0.06)]">
            <Shield className="w-3 h-3 text-emerald-400" /> Local-Only
          </div>
        ) : (
          <div className="status-pill status-pill-neutral flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 tracking-wide text-[10px] uppercase">
            <Globe className="w-3 h-3 text-zinc-500" /> Cloud Enabled
          </div>
        )}
      </div>
    </header>
  )
}
