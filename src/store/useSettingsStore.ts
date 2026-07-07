import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderId } from '../config/providers'
import { PROVIDER_DEFAULT_URLS, PROVIDER_DEFAULT_MODELS } from '../config/providers'

export interface SettingsState {
  apiKeys: Record<ProviderId, string>;
  baseUrls: Record<ProviderId, string>;
  selectedModels: Record<ProviderId, string>;
  privacyMode: boolean;
  setApiKey: (provider: ProviderId, key: string) => void;
  setBaseUrl: (provider: ProviderId, url: string) => void;
  setSelectedModel: (provider: ProviderId, model: string) => void;
  setPrivacyMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKeys: {
        openai: '',
        anthropic: '',
        gemini: '',
        openrouter: '',
        ollama: '',
        webgpu: '',
      },
      baseUrls: PROVIDER_DEFAULT_URLS,
      selectedModels: PROVIDER_DEFAULT_MODELS,
      privacyMode: false,

      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),

      setBaseUrl: (provider, url) =>
        set((state) => ({
          baseUrls: { ...state.baseUrls, [provider]: url },
        })),

      setSelectedModel: (provider, model) =>
        set((state) => ({
          selectedModels: { ...state.selectedModels, [provider]: model },
        })),

      setPrivacyMode: (enabled) => set({ privacyMode: enabled }),
    }),
    {
      name: 'omnibox-settings-v1',
    }
  )
)
