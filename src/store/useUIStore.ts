import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WORKSPACE_IDS = ['grammar', 'career', 'history', 'settings'] as const

export type WorkspaceId = (typeof WORKSPACE_IDS)[number]

export const isWorkspaceId = (value: unknown): value is WorkspaceId =>
  typeof value === 'string' && WORKSPACE_IDS.includes(value as WorkspaceId)

const UI_STORAGE_KEY = 'omnibox-ui-v1'
const DEFAULT_WORKSPACE: WorkspaceId = 'grammar'

const readStoredWorkspace = (): WorkspaceId | null => {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(UI_STORAGE_KEY)
    if (!rawValue) return null

    const parsed: unknown = JSON.parse(rawValue)
    if (isWorkspaceId(parsed)) return parsed

    const state = parsed && typeof parsed === 'object' && parsed !== null && 'state' in parsed
      ? (parsed as { state?: unknown }).state
      : parsed

    if (!state || typeof state !== 'object' || Array.isArray(state)) return null

    const activeWorkspace = (state as { activeWorkspace?: unknown }).activeWorkspace ?? (parsed as { activeWorkspace?: unknown }).activeWorkspace
    return isWorkspaceId(activeWorkspace) ? activeWorkspace : null
  } catch {
    return null
  }
}

const readWorkspaceFromLocation = (): WorkspaceId | null => {
  if (typeof window === 'undefined') return null

  const workspace = new URL(window.location.href).searchParams.get('workspace')
  return isWorkspaceId(workspace) ? workspace : null
}

const resolveInitialWorkspace = (): WorkspaceId =>
  readWorkspaceFromLocation() ?? readStoredWorkspace() ?? DEFAULT_WORKSPACE

export interface UIState {
  sidebarOpen: boolean;
  activeWorkspace: WorkspaceId;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeWorkspace: resolveInitialWorkspace(),
      theme: 'dark',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'omnibox-ui-v1',
      merge: (persistedState, currentState) => {
        const persistedWorkspace =
          persistedState && typeof persistedState === 'object' && 'activeWorkspace' in persistedState
            ? (persistedState as { activeWorkspace?: unknown }).activeWorkspace
            : undefined

        return {
          ...currentState,
          ...(persistedState as Partial<UIState>),
          activeWorkspace: isWorkspaceId(currentState.activeWorkspace)
            ? currentState.activeWorkspace
            : isWorkspaceId(persistedWorkspace)
              ? persistedWorkspace
              : DEFAULT_WORKSPACE,
        }
      },
    }
  )
)
