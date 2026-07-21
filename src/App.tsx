import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from './store/useSettingsStore'
import { useUIStore } from './store/useUIStore'
import { PROVIDER_MODELS_LIST, PROVIDER_DEFAULT_MODELS } from './config/providers'
import { AppSidebar } from './components/layout/AppSidebar'
import { AppHeader } from './components/layout/AppHeader'
import { WorkspaceRouter } from './components/layout/WorkspaceRouter'
import { createNavigationController, type NavigationController, type RouteDescriptor } from './navigation'
import { getRouteSubtitle, getRouteTitle } from './features/tools/toolNavigation'

const App: React.FC = () => {
  const settings = useSettingsStore()
  const ui = useUIStore()
  const navigation = useMemo<NavigationController | null>(() => {
    if (typeof window === 'undefined') return null

    return createNavigationController({ window, setRoute: ui.setRoute })
  }, [ui.setRoute])

  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    const stop = navigation?.start()
    return () => stop?.()
  }, [navigation])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement
      root.classList.toggle('light', ui.theme === 'light')
    }
  }, [ui.theme])

  const navigateRoute = useCallback((route: RouteDescriptor) => {
    navigation?.navigate(route)
  }, [navigation])

  const routeTitle = getRouteTitle(ui.route)
  const routeSubtitle = getRouteSubtitle(ui.route)
  const isDrawerOpen = ui.sidebarOpen && isMobileViewport

  return (
    <div className="flex min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100 antialiased font-sans">
      <AppSidebar
        route={ui.route}
        sidebarOpen={ui.sidebarOpen}
        onToggleSidebar={ui.toggleSidebar}
        onNavigate={navigateRoute}
        webGpuSupported={webGpuSupported}
        privacyMode={settings.privacyMode}
      />

      <div className="flex flex-1 min-w-0 flex-col bg-[#09090b]">
        <AppHeader
          title={routeTitle}
          subtitle={routeSubtitle}
          privacyMode={settings.privacyMode}
          sidebarOpen={ui.sidebarOpen}
          onToggleSidebar={ui.toggleSidebar}
          theme={ui.theme}
          onToggleTheme={ui.toggleTheme}
        />

        <main className={`flex-1 overflow-y-auto overflow-x-clip p-4 md:p-6 ${isDrawerOpen ? 'pointer-events-none select-none' : ''}`} aria-hidden={isDrawerOpen || undefined}>
          <WorkspaceRouter
            route={ui.route}
            onNavigate={navigateRoute}
            privacyMode={settings.privacyMode}
            webGpuSupported={webGpuSupported}
          />
        </main>
      </div>
    </div>
  )
}


export default App
