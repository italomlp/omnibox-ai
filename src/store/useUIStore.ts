import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  WORKBENCH_ROUTE,
  isRouteDescriptor,
  resolveRoute,
  routeForLegacyWorkspace,
  type RouteDescriptor,
} from '../navigation'

const UI_STORAGE_KEY = 'omnibox-ui-v1'

type Theme = 'dark' | 'light'

export type WorkspaceId = 'grammar' | 'career' | 'history' | 'settings'

export const isWorkspaceId = (value: unknown): value is WorkspaceId =>
  value === 'grammar' || value === 'career' || value === 'history' || value === 'settings'

interface PersistedUIState {
  route: RouteDescriptor
  sidebarOpen: boolean
  theme: Theme
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizePersistedUIState = (value: unknown): PersistedUIState => {
  const state = isRecord(value) ? value : {}
  const route = isRouteDescriptor(state.route)
    ? state.route
    : routeForLegacyWorkspace(state.activeWorkspace) ?? WORKBENCH_ROUTE

  return {
    route,
    sidebarOpen: typeof state.sidebarOpen === 'boolean' ? state.sidebarOpen : true,
    theme: state.theme === 'light' ? 'light' : 'dark',
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
  toggleSidebar: () => void
  setRoute: (route: RouteDescriptor) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...resolveInitialUIState(),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setRoute: (route) => set({ route: isRouteDescriptor(route) ? route : WORKBENCH_ROUTE }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 2,
      migrate: (persistedState) => normalizePersistedUIState(persistedState),
      partialize: (state) => ({
        route: state.route,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
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
