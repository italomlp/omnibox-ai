import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Cpu, Layers3, LibraryBig, Settings2, Shield, Sparkles, SquareStack } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import { getToolCategory, getTool } from '../../tools/getTool'

interface AppSidebarProps {
  route: RouteDescriptor
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onNavigate: (route: RouteDescriptor) => void
  webGpuSupported: boolean | null
  privacyMode: boolean
}

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setIsMobile(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  return isMobile
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  route,
  sidebarOpen,
  onToggleSidebar,
  onNavigate,
  webGpuSupported,
  privacyMode,
}) => {
  const isMobile = useIsMobileViewport()
  const expandedContentClass = sidebarOpen ? 'block' : 'hidden'
  const activePrimaryView = route.view === 'tool' ? 'tools' : route.view

  const activeTool = useMemo(() => (route.view === 'tool' ? getTool(route.tool) : null), [route])
  const primaryNavigation = [
    { view: 'workbench' as const, label: 'Workbench', description: 'Landing area', icon: SquareStack },
    { view: 'tools' as const, label: 'Tools', description: 'Catalog', icon: Layers3 },
    { view: 'library' as const, label: 'Library', description: 'Runs and documents', icon: LibraryBig },
    { view: 'system' as const, label: 'System', description: 'Privacy and providers', icon: Settings2 },
  ]

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="app-sidebar-overlay theme-overlay fixed inset-0 backdrop-blur-sm z-20 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      <aside
        className={`app-sidebar theme-panel flex flex-col transition-all duration-300 z-30
          fixed md:static inset-y-0 left-0
          ${sidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full md:w-16 md:translate-x-0'
          }`}
      >
        {/* Brand Header */}
        <div className={`flex min-h-16 items-center border-b border-[color:var(--app-border)] flex-shrink-0 ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-0'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--app-accent)] font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
                  Ω
                </div>
                <span className="font-bold text-sm bg-gradient-to-r from-[color:var(--app-text)] to-indigo-400 bg-clip-text text-transparent truncate tracking-tight">
                  OmniBox AI
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="theme-icon-button p-1 rounded-md"
                aria-label="Close sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4 my-4 items-center">
              {/* Logo for mobile hidden state, Toggle for desktop collapsed state */}
              {/* <div className="flex items-center justify-center w-full"> */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--app-accent)] font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
                  Ω
                </div>
              {/* </div> */}
              <button
                type="button"
                onClick={onToggleSidebar}
                className="theme-icon-button hidden md:flex p-1 rounded-md"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {primaryNavigation.map((item) => {
            const Icon = item.icon
            const isActive = activePrimaryView === item.view
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => {
                  onNavigate({ view: item.view })
                  if (isMobile) {
                    onToggleSidebar()
                  }
                }}
                className={`app-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive
                    ? 'app-nav-item-active bg-[color:var(--app-surface-muted)] text-[color:var(--app-accent)] border border-[color:var(--app-border)] shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                    : 'theme-text-muted hover:bg-[color:var(--app-surface-muted)] hover:text-[color:var(--app-text)] border border-transparent'
                }`}
                title={!sidebarOpen ? item.label : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'theme-accent-text' : 'theme-text-faint group-hover:text-[color:var(--app-text)]'}`} />
                <div className={`${expandedContentClass} flex-1 min-w-0`}>
                  <p className="text-xs font-semibold tracking-wide truncate">{item.label}</p>
                  <p className="text-[9px] theme-text-faint truncate mt-0.5 leading-none">{item.description}</p>
                </div>
              </button>
            )
          })}
        </nav>

        <div className={`border-t border-[color:var(--app-border)] ${sidebarOpen ? 'px-3 py-3' : 'py-3 flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="theme-panel-strong rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] theme-text-faint">Active tool</div>
                {route.view === 'tool' ? (
                  <span className="status-pill-success rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    Selected
                  </span>
                ) : null}
              </div>

              {activeTool ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 theme-accent-text" />
                    <div className="min-w-0 block">
                      <div className="truncate text-sm font-medium theme-text-strong">{activeTool.title}</div>
                      <div className="truncate text-[11px] theme-text-faint">{getToolCategory(activeTool.categoryId).title}</div>
                    </div>
                  </div>
                  <p className="block text-[11px] leading-5 theme-text-faint">{activeTool.description}</p>
                </div>
              ) : (
                <div className="mt-3 block text-[11px] leading-5 theme-text-faint">
                  Choose a tool from the catalog to surface it here.
                </div>
              )}

              <button
                type="button"
                onClick={() => onNavigate({ view: 'tools' })}
                className="theme-button-secondary mt-3 inline-flex w-full justify-center items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <Layers3 className="h-3.5 w-3.5" />
                <span>Browse tools</span>
              </button>
            </div>
          ) : (
            activeTool ? (
              <button
                onClick={() => onNavigate({ view: 'tool', tool: activeTool.id })}
                className="theme-icon-button flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] transition-all"
                title={`Active Tool: ${activeTool.title}`}
                aria-label={`Active Tool: ${activeTool.title}`}
              >
                <Sparkles className="h-4 w-4 theme-accent-text" />
              </button>
            ) : (
              <button
                onClick={() => onNavigate({ view: 'tools' })}
                className="theme-icon-button flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                title="Browse catalog"
                aria-label="Browse catalog"
              >
                <Layers3 className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {/* Sidebar Footer Indicators */}
        <div className="p-3 border-t border-[color:var(--app-border)] space-y-2 flex-shrink-0">
          {/* WebGPU Status Indicator */}
          <div 
            className={`status-card flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
            title={
              webGpuSupported === null
                ? 'Verifying GPU...'
                : webGpuSupported
                ? 'WebGPU Active'
                : 'No WebGPU'
            }
          >
              <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${
              webGpuSupported === null
                ? 'theme-text-faint'
                : webGpuSupported
                ? 'theme-accent-text shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-none'
                : 'theme-warning-text'
            }`} />
            {sidebarOpen && (
              <span className="text-[10px] theme-text-muted truncate">
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
            <div 
              className={`status-card status-card-success flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
              title="Privacy Locked"
            >
              <Shield className="w-3.5 h-3.5 flex-shrink-0 theme-success-text" />
              {sidebarOpen && (
                <span className="text-[10px] theme-success-text font-semibold truncate leading-none">
                  Privacy Locked
                </span>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
