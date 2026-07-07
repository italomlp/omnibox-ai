import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UIState {
  sidebarOpen: boolean;
  activeWorkspace: string;
  toggleSidebar: () => void;
  setActiveWorkspace: (workspace: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeWorkspace: 'grammar',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
    }),
    {
      name: 'omnibox-ui-v1',
    }
  )
)
