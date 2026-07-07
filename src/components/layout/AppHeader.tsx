import React from 'react'
import { Globe, Menu, Shield } from 'lucide-react'

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
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-900/60 px-6 backdrop-blur-md bg-zinc-950/45 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Menu icon if sidebar collapses */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all mr-1 md:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <h1 className="text-sm font-bold tracking-wider text-zinc-200 uppercase">
          {workspaceName}
        </h1>
      </div>

      {/* Global Indicators Bar */}
      <div className="flex items-center gap-4 text-xs">
        {privacyMode ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 font-semibold tracking-wide text-[10px] uppercase shadow-[0_0_10px_rgba(16,185,129,0.06)]">
            <Shield className="w-3 h-3 text-emerald-400" /> Local-Only
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 tracking-wide text-[10px] uppercase">
            <Globe className="w-3 h-3 text-zinc-500" /> Cloud Enabled
          </div>
        )}
      </div>
    </header>
  )
}
