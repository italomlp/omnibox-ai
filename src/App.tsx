import React, { useState, useEffect } from 'react'
import { useSettingsStore } from './store/useSettingsStore'
import { useUIStore } from './store/useUIStore'
import { PROVIDER_MODELS_LIST, PROVIDER_DEFAULT_MODELS } from './config/providers'
import { AppSidebar } from './components/layout/AppSidebar'
import { AppHeader } from './components/layout/AppHeader'
import { WorkspaceRouter } from './components/layout/WorkspaceRouter'
import { Sparkles, Briefcase, Settings, History } from 'lucide-react'

const App: React.FC = () => {
  const settings = useSettingsStore()
  const ui = useUIStore()
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
    if (!PROVIDER_MODELS_LIST.webgpu.includes(activeWebGpuModel)) {
      settings.setSelectedModel('webgpu', PROVIDER_DEFAULT_MODELS.webgpu)
    }
  }, [settings])

  const workspaces = [
    { id: 'grammar', name: 'Grammar & Tone', icon: Sparkles, desc: 'Proofread & style shifters' },
    { id: 'career', name: 'Career Suite', icon: Briefcase, desc: 'ATS audits & job matrix gap analysis' },
    { id: 'history', name: 'Activity History', icon: History, desc: 'Past prompt logs & responses' },
    { id: 'settings', name: 'API Settings', icon: Settings, desc: 'BYOK credentials & models' },
  ]


  const activeWorkspaceName = workspaces.find((w) => w.id === ui.activeWorkspace)?.name || 'OmniBox AI'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      if (ui.theme === 'light') {
        root.classList.add('light')
      } else {
        root.classList.remove('light')
      }
    }
  }, [ui.theme])

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      <AppSidebar
        workspaces={workspaces}
        activeWorkspace={ui.activeWorkspace}
        sidebarOpen={ui.sidebarOpen}
        onToggleSidebar={ui.toggleSidebar}
        onSelectWorkspace={ui.setActiveWorkspace}
        webGpuSupported={webGpuSupported}
        privacyMode={settings.privacyMode}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        <AppHeader
          workspaceName={activeWorkspaceName}
          privacyMode={settings.privacyMode}
          sidebarOpen={ui.sidebarOpen}
          onToggleSidebar={ui.toggleSidebar}
        />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto select-none">
          <div className="mx-auto max-w-5xl">
            <WorkspaceRouter activeWorkspace={ui.activeWorkspace} />
          </div>
        </main>
      </div>
    </div>
  )
}


export default App
