import React from 'react'
import { ChevronLeft, ChevronRight, Cpu, Shield } from 'lucide-react'

interface WorkspaceItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

interface AppSidebarProps {
  workspaces: WorkspaceItem[];
  activeWorkspace: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSelectWorkspace: (id: string) => void;
  webGpuSupported: boolean | null;
  privacyMode: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  workspaces,
  activeWorkspace,
  sidebarOpen,
  onToggleSidebar,
  onSelectWorkspace,
  webGpuSupported,
  privacyMode,
}) => {
  return (
    <aside
      className={`flex flex-col border-r border-zinc-900/60 bg-zinc-950 transition-all duration-300 z-20 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-900/60">
        <div className={`flex items-center gap-2.5 overflow-hidden ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
            Ω
          </div>
          {sidebarOpen && (
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent truncate tracking-tight">
              OmniBox AI
            </span>
          )}
        </div>
        {sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Workspace Selectors */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {workspaces.map((w) => {
          const Icon = w.icon
          const isActive = activeWorkspace === w.id
          return (
            <button
              key={w.id}
              onClick={() => onSelectWorkspace(w.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-zinc-900/70 text-indigo-400 border border-zinc-800/80 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                  : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 border border-transparent'
              }`}
              title={!sidebarOpen ? w.name : ''}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold tracking-wide truncate">{w.name}</p>
                  <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-none">{w.desc}</p>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer Indicators */}
      <div className="p-3 border-t border-zinc-900/60 space-y-2">
        {/* Collapse toggle when narrow */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="w-full flex h-8 items-center justify-center rounded-lg hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* WebGPU Status Indicator */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/20 text-xs border border-zinc-900/40 ${!sidebarOpen && 'justify-center'}`}>
          <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${
            webGpuSupported === null
              ? 'text-zinc-500'
              : webGpuSupported
              ? 'text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-none'
              : 'text-yellow-500'
          }`} />
          {sidebarOpen && (
            <span className="text-[10px] text-zinc-400 truncate">
              {webGpuSupported === null
                ? 'Verifying GPU...'
                : webGpuSupported
                ? 'WebGPU Active'
                : 'No WebGPU'}
            </span>
          )}
        </div>

        {/* Privacy Indicator */}
        {privacyMode && (
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/10 border border-emerald-900/20 text-xs ${!sidebarOpen && 'justify-center'}`}>
            <Shield className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            {sidebarOpen && (
              <span className="text-[10px] text-emerald-300 font-semibold truncate leading-none">
                Privacy Locked
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
