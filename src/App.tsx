import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useSettingsStore } from './store/useSettingsStore'
import { useUIStore, type WorkspaceId, isWorkspaceId } from './store/useUIStore'
import { PROVIDER_MODELS_LIST, PROVIDER_DEFAULT_MODELS } from './config/providers'
import { AppSidebar } from './components/layout/AppSidebar'
import { AppHeader } from './components/layout/AppHeader'
import { WorkspaceRouter } from './components/layout/WorkspaceRouter'
import { Sparkles, Briefcase, Settings, History } from 'lucide-react'

const WORKSPACE_QUERY_PARAM = 'workspace'

const getWorkspaceFromLocation = (): WorkspaceId | null => {
  if (typeof window === 'undefined') return null

  const workspace = new URL(window.location.href).searchParams.get(WORKSPACE_QUERY_PARAM)
  return isWorkspaceId(workspace) ? workspace : null
}

const buildWorkspaceUrl = (workspace: WorkspaceId) => {
  const url = new URL(window.location.href)
  url.searchParams.set(WORKSPACE_QUERY_PARAM, workspace)
  return `${url.pathname}${url.search}${url.hash}`
}

const App: React.FC = () => {
  const settings = useSettingsStore()
  const ui = useUIStore()
  const { activeWorkspace, setActiveWorkspace } = ui
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

  const workspaces: Array<{ id: WorkspaceId; name: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const locationWorkspace = getWorkspaceFromLocation()
    const canonicalWorkspace = activeWorkspace

    if (locationWorkspace === canonicalWorkspace) return

    window.history.replaceState({ workspace: canonicalWorkspace }, '', buildWorkspaceUrl(canonicalWorkspace))
  }, [activeWorkspace])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      const workspaceFromUrl = getWorkspaceFromLocation() ?? 'grammar'
      setActiveWorkspace(workspaceFromUrl)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setActiveWorkspace])

  const navigateWorkspace = useCallback((workspace: WorkspaceId) => {
    if (typeof window === 'undefined') return

    if (activeWorkspace === workspace && getWorkspaceFromLocation() === workspace) {
      return
    }

    window.history.pushState({ workspace }, '', buildWorkspaceUrl(workspace))
    setActiveWorkspace(workspace)
  }, [activeWorkspace, setActiveWorkspace])

  return (
    <div className="flex min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100 antialiased font-sans">
      <AppSidebar
        workspaces={workspaces}
        activeWorkspace={ui.activeWorkspace}
        sidebarOpen={ui.sidebarOpen}
        onToggleSidebar={ui.toggleSidebar}
        onSelectWorkspace={navigateWorkspace}
        webGpuSupported={webGpuSupported}
        privacyMode={settings.privacyMode}
      />

      <div className="flex flex-1 min-w-0 flex-col bg-[#09090b]">
        <AppHeader
          workspaceName={activeWorkspaceName}
          privacyMode={settings.privacyMode}
          sidebarOpen={ui.sidebarOpen}
          onToggleSidebar={ui.toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto overflow-x-clip p-4 md:p-6">
          <div className="mx-auto max-w-5xl">
            <WorkspaceRouter activeWorkspace={ui.activeWorkspace} onNavigateWorkspace={navigateWorkspace} />
          </div>
        </main>
      </div>
    </div>
  )
}


export default App
