import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isToolId } from '../navigation'
import {
  WORKBENCH_ROUTE,
  isRouteDescriptor,
  resolveRoute,
  routeForLegacyWorkspace,
  type RouteDescriptor,
} from '../navigation'

const UI_STORAGE_KEY = 'omnibox-ui-v1'
const UI_STORAGE_VERSION = 3
const RECENT_TOOL_LIMIT = 8

type Theme = 'dark' | 'light'

export type WorkspaceId = 'grammar' | 'career' | 'history' | 'settings'

export const isWorkspaceId = (value: unknown): value is WorkspaceId =>
  value === 'grammar' || value === 'career' || value === 'history' || value === 'settings'

interface PersistedUIState {
  route: RouteDescriptor
  sidebarOpen: boolean
  theme: Theme
  pinnedToolIds: string[]
  recentToolIds: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeToolIdList = (value: unknown, limit?: number): string[] => {
  if (!Array.isArray(value)) return []

  const ids: string[] = []

  for (const candidate of value) {
    if (!isToolId(candidate) || ids.includes(candidate)) continue
    ids.push(candidate)

    if (typeof limit === 'number' && ids.length >= limit) break
  }

  return ids
}

const normalizePersistedUIState = (value: unknown): PersistedUIState => {
  const state = isRecord(value) ? value : {}
  const route = isRouteDescriptor(state.route)
    ? state.route
    : routeForLegacyWorkspace(state.activeWorkspace) ?? WORKBENCH_ROUTE

  return {
    route,
    sidebarOpen: typeof state.sidebarOpen === 'boolean' ? state.sidebarOpen : true,
    theme: state.theme === 'light' ? 'light' : 'dark',
    pinnedToolIds: normalizeToolIdList(state.pinnedToolIds),
    recentToolIds: normalizeToolIdList(state.recentToolIds, RECENT_TOOL_LIMIT),
  }
}

const readStoredUIState = (): PersistedUIState | null => {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(UI_STORAGE_KEY)
    if (!rawValue) return null

    const parsed: unknown = JSON.parse(rawValue)
    const state = isRecord(parsed) && 'state' in parsed ? parsed.state : parsed
    return normalizePersistedUIState(state)
  } catch {
    return null
  }
}

const readRouteFromLocation = (): RouteDescriptor | null => {
  if (typeof window === 'undefined') return null

  const resolution = resolveRoute(new URL(window.location.href))
  return resolution.source === 'none' ? null : resolution.route
}

const resolveInitialUIState = (): PersistedUIState => {
  const persistedState = readStoredUIState() ?? normalizePersistedUIState(undefined)
  return { ...persistedState, route: readRouteFromLocation() ?? persistedState.route }
}

export interface UIState {
  sidebarOpen: boolean
  route: RouteDescriptor
  theme: Theme
  pinnedToolIds: string[]
  recentToolIds: string[]
  toggleSidebar: () => void
  setRoute: (route: RouteDescriptor) => void
  toggleTheme: () => void
  togglePinnedTool: (toolId: string) => void
  recordRecentTool: (toolId: string) => void
}

const pushUniqueToolId = (toolIds: string[], toolId: string, limit: number): string[] => {
  const next = [toolId, ...toolIds.filter((candidate) => candidate !== toolId)]
  return next.slice(0, limit)
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...resolveInitialUIState(),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setRoute: (route) => set({ route: isRouteDescriptor(route) ? route : WORKBENCH_ROUTE }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      togglePinnedTool: (toolId) => set((state) => {
        if (!isToolId(toolId)) return {}

        return state.pinnedToolIds.includes(toolId)
          ? { pinnedToolIds: state.pinnedToolIds.filter((candidate) => candidate !== toolId) }
          : { pinnedToolIds: [toolId, ...state.pinnedToolIds] }
      }),
      recordRecentTool: (toolId) => set((state) => {
        if (!isToolId(toolId)) return {}

        return { recentToolIds: pushUniqueToolId(state.recentToolIds, toolId, RECENT_TOOL_LIMIT) }
      }),
    }),
    {
      name: UI_STORAGE_KEY,
      version: UI_STORAGE_VERSION,
      migrate: (persistedState) => normalizePersistedUIState(persistedState),
      partialize: (state) => ({
        route: state.route,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        pinnedToolIds: state.pinnedToolIds,
        recentToolIds: state.recentToolIds,
      }),
      merge: (persistedState, currentState) => {
        const storedState = normalizePersistedUIState(persistedState)
        const locationRoute = readRouteFromLocation()

        return {
          ...currentState,
          ...storedState,
          route: locationRoute ?? storedState.route,
        }
      },
    }
  )
)
