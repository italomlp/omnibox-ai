import React, { useState, useEffect } from 'react'
import { useSettingsStore, PROVIDER_MODELS_LIST, PROVIDER_DEFAULT_MODELS } from './store/store'
import { SettingsPanel } from './components/SettingsPanel'
import { GrammarWorkspace } from './workspaces/GrammarWorkspace'
import { CareerWorkspace } from './workspaces/CareerWorkspace'
import { 
  Sparkles, 
  Briefcase, 
  Settings, 
  Shield, 
  Menu, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  Globe
} from 'lucide-react'

const App: React.FC = () => {
  const settings = useSettingsStore()
  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasGPU = 'gpu' in navigator && navigator.gpu !== undefined
      setWebGpuSupported(hasGPU)
    }
  }, [])

  // Auto-upgrade invalid or low-end cached model configs from localStorage to Gemma-2B
  useEffect(() => {
    const activeWebGpuModel = settings.selectedModels.webgpu
    if (activeWebGpuModel === 'Llama-3.2-1B-Instruct-q4f16_1-MLC' || !PROVIDER_MODELS_LIST.webgpu.includes(activeWebGpuModel)) {
      settings.setSelectedModel('webgpu', PROVIDER_DEFAULT_MODELS.webgpu)
    }
  }, [settings])

  const renderActiveWorkspace = () => {
    switch (settings.activeWorkspace) {
      case 'grammar':
        return <GrammarWorkspace />
      case 'career':
        return <CareerWorkspace />
      case 'settings':
        return <SettingsPanel />
      default:
        return <GrammarWorkspace />
    }
  }

  const workspaces = [
    { id: 'grammar', name: 'Grammar & Tone', icon: Sparkles, desc: 'Proofread & style shifters' },
    { id: 'career', name: 'Career Suite', icon: Briefcase, desc: 'ATS audits & job matrix gap analysis' },
    { id: 'settings', name: 'API Settings', icon: Settings, desc: 'BYOK credentials & models' },
  ]

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* LEFT SIDEBAR PANEL */}
      <aside 
        className={`flex flex-col border-r border-zinc-900/60 bg-zinc-950 transition-all duration-300 z-20 ${
          settings.sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-900/60">
          <div className={`flex items-center gap-2.5 overflow-hidden ${!settings.sidebarOpen && 'justify-center w-full'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
              Ω
            </div>
            {settings.sidebarOpen && (
              <span className="font-bold text-sm bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent truncate tracking-tight">
                OmniBox AI
              </span>
            )}
          </div>
          {settings.sidebarOpen && (
            <button 
              onClick={settings.toggleSidebar}
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
            const isActive = settings.activeWorkspace === w.id
            return (
              <button
                key={w.id}
                onClick={() => settings.setActiveWorkspace(w.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive 
                    ? 'bg-zinc-900/70 text-indigo-400 border border-zinc-800/80 shadow-[0_0_12px_rgba(99,102,241,0.08)]' 
                    : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 border border-transparent'
                }`}
                title={!settings.sidebarOpen ? w.name : ''}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                {settings.sidebarOpen && (
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
          {!settings.sidebarOpen && (
            <button 
              onClick={settings.toggleSidebar}
              className="w-full flex h-8 items-center justify-center rounded-lg hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* WebGPU Status Indicator */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/20 text-xs border border-zinc-900/40 ${!settings.sidebarOpen && 'justify-center'}`}>
            <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${
              webGpuSupported === null 
                ? 'text-zinc-500' 
                : webGpuSupported 
                  ? 'text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-none' 
                  : 'text-yellow-500'
            }`} />
            {settings.sidebarOpen && (
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
          {settings.privacyMode && (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/10 border border-emerald-900/20 text-xs ${!settings.sidebarOpen && 'justify-center'}`}>
              <Shield className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
              {settings.sidebarOpen && (
                <span className="text-[10px] text-emerald-300 font-semibold truncate leading-none">
                  Privacy Locked
                </span>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEW AREA CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {/* Top Header Navigation */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-900/60 px-6 backdrop-blur-md bg-zinc-950/45 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Menu icon if sidebar collapses */}
            {!settings.sidebarOpen && (
              <button 
                onClick={settings.toggleSidebar}
                className="p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all mr-1 md:hidden"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            
            <h1 className="text-sm font-bold tracking-wider text-zinc-200 uppercase">
              {workspaces.find((w) => w.id === settings.activeWorkspace)?.name || 'OmniBox AI'}
            </h1>
          </div>

          {/* Global Indicators Bar */}
          <div className="flex items-center gap-4 text-xs">
            {settings.privacyMode ? (
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

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-6 overflow-y-auto select-none">
          <div className="mx-auto max-w-5xl">
            {renderActiveWorkspace()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
