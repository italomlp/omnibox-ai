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
  const expandedContentClass = sidebarOpen ? 'block' : 'block md:hidden'
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
          className="app-sidebar-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      <aside
        className={`app-sidebar flex flex-col border-r border-zinc-900/60 bg-zinc-950 transition-all duration-300 z-30
          fixed md:static inset-y-0 left-0
          ${sidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full md:w-16 md:translate-x-0'
          }`}
      >
        {/* Brand Header */}
        <div className={`flex h-16 items-center border-b border-zinc-900/60 flex-shrink-0 ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-0'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
                  Ω
                </div>
                <span className="font-bold text-sm bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent truncate tracking-tight">
                  OmniBox AI
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="theme-icon-button p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Logo for mobile hidden state, Toggle for desktop collapsed state */}
              <div className="flex items-center justify-center md:hidden w-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
                  Ω
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="theme-icon-button hidden md:flex p-1 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
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
                    ? 'app-nav-item-active bg-zinc-900/70 text-indigo-400 border border-zinc-800/80 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                    : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200 border border-transparent'
                }`}
                title={!sidebarOpen ? item.label : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                <div className={`${expandedContentClass} flex-1 min-w-0`}>
                  <p className="text-xs font-semibold tracking-wide truncate">{item.label}</p>
                  <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-none">{item.description}</p>
                </div>
              </button>
            )
          })}
        </nav>

        <div className={`border-t border-zinc-900/60 ${sidebarOpen ? 'px-3 py-3' : 'py-3 flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Active tool</div>
                {route.view === 'tool' ? (
                  <span className="rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Selected
                  </span>
                ) : null}
              </div>

              {activeTool ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <div className="min-w-0 block">
                      <div className="truncate text-sm font-medium text-zinc-100">{activeTool.title}</div>
                      <div className="truncate text-[11px] text-zinc-500">{getToolCategory(activeTool.categoryId).title}</div>
                    </div>
                  </div>
                  <p className="block text-[11px] leading-5 text-zinc-500">{activeTool.description}</p>
                </div>
              ) : (
                <div className="mt-3 block text-[11px] leading-5 text-zinc-500">
                  Choose a tool from the catalog to surface it here.
                </div>
              )}

              <button
                type="button"
                onClick={() => onNavigate({ view: 'tools' })}
                className="mt-3 inline-flex w-full justify-center items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
              >
                <Layers3 className="h-3.5 w-3.5" />
                <span>Browse tools</span>
              </button>
            </div>
          ) : (
            activeTool ? (
              <button
                onClick={() => onNavigate({ view: 'tool', tool: activeTool.id })}
                className="theme-icon-button flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-900/40 bg-indigo-950/20 text-indigo-400 hover:bg-indigo-900/30 transition-all"
                title={`Active Tool: ${activeTool.title}`}
                aria-label={`Active Tool: ${activeTool.title}`}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => onNavigate({ view: 'tools' })}
                className="theme-icon-button flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all"
                title="Browse catalog"
                aria-label="Browse catalog"
              >
                <Layers3 className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {/* Sidebar Footer Indicators */}
        <div className="p-3 border-t border-zinc-900/60 space-y-2 flex-shrink-0">
          {/* WebGPU Status Indicator */}
          <div 
            className={`status-card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/20 text-xs border border-zinc-900/40 ${!sidebarOpen ? 'justify-center' : ''}`}
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
            <div 
              className={`status-card status-card-success flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/10 border border-emerald-900/20 text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
              title="Privacy Locked"
            >
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
    </>
  )
}
