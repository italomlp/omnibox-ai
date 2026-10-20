import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isNativeAndroid } from '../platform/runtime'
import type { ProviderId } from '../config/providers'
import { PROVIDER_DEFAULT_URLS, PROVIDER_DEFAULT_MODELS } from '../config/providers'

export type LocalQualityPolicy = 'fast' | 'balanced' | 'quality' | 'auto'

export interface SettingsState {
  apiKeys: Record<ProviderId, string>;
  baseUrls: Record<ProviderId, string>;
  selectedModels: Record<ProviderId, string>;
  privacyMode: boolean;
  localQualityPolicy: LocalQualityPolicy;
  allowLocalModelEscalation: boolean;
  allowCloudFallback: boolean;
  showRawModelDiagnostics: boolean;
  setApiKey: (provider: ProviderId, key: string) => void;
  setBaseUrl: (provider: ProviderId, url: string) => void;
  setSelectedModel: (provider: ProviderId, model: string) => void;
  setPrivacyMode: (enabled: boolean) => void;
  setLocalQualityPolicy: (policy: LocalQualityPolicy) => void;
  setAllowLocalModelEscalation: (enabled: boolean) => void;
  setAllowCloudFallback: (enabled: boolean) => void;
  setShowRawModelDiagnostics: (enabled: boolean) => void;
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
      localQualityPolicy: 'auto',
      allowLocalModelEscalation: true,
      allowCloudFallback: false,
      showRawModelDiagnostics: false,

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

      setPrivacyMode: (enabled) =>
        set((state) => ({
          privacyMode: enabled,
          allowCloudFallback: enabled ? false : state.allowCloudFallback,
        })),

      setLocalQualityPolicy: (policy) => set({ localQualityPolicy: policy }),

      setAllowLocalModelEscalation: (enabled) => set({ allowLocalModelEscalation: enabled }),

      setAllowCloudFallback: (enabled) =>
        set((state) => ({
          allowCloudFallback: state.privacyMode ? false : enabled,
        })),

      setShowRawModelDiagnostics: (enabled) => set({ showRawModelDiagnostics: enabled }),
    }),
    {
      name: 'omnibox-settings-v1',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const raw = localStorage.getItem(name)
          if (!raw || !isNativeAndroid()) return raw
          try {
            const value = JSON.parse(raw)
            if (value.state?.apiKeys) {
              delete value.state.apiKeys
              const sanitized = JSON.stringify(value)
              localStorage.setItem(name, sanitized)
              return sanitized
            }
          } catch { /* Zustand handles invalid persisted JSON. */ }
          return raw
        },
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: (state) => {
        if (!isNativeAndroid()) return state
        const { apiKeys: _apiKeys, ...preferences } = state
        return preferences
      },
      merge: (persistedState, currentState) => {
        const nextState = {
          ...currentState,
          ...(persistedState as Partial<SettingsState>),
        }

        return {
          ...nextState,
          apiKeys: isNativeAndroid() ? currentState.apiKeys : nextState.apiKeys,
          allowCloudFallback: nextState.privacyMode ? false : nextState.allowCloudFallback,
        }
      },
    }
  )
)
