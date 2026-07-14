import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UIState {
  sidebarOpen: boolean;
  activeWorkspace: string;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setActiveWorkspace: (workspace: string) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeWorkspace: 'grammar',
      theme: 'dark',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'omnibox-ui-v1',
    }
  )
)
