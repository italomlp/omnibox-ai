import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

export interface SettingsState {
  apiKeys: Record<ProviderId, string>;
  baseUrls: Record<ProviderId, string>;
  selectedModels: Record<ProviderId, string>;
  privacyMode: boolean;
  activeWorkspace: string;
  sidebarOpen: boolean;
  setApiKey: (provider: ProviderId, key: string) => void;
  setBaseUrl: (provider: ProviderId, url: string) => void;
  setSelectedModel: (provider: ProviderId, model: string) => void;
  setPrivacyMode: (enabled: boolean) => void;
  setActiveWorkspace: (workspace: string) => void;
  toggleSidebar: () => void;
}

export const PROVIDER_DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  openrouter: 'meta-llama/llama-3-8b-instruct:free',
  ollama: 'llama3',
  webgpu: 'gemma-2-2b-it-q4f16_1-MLC',
};

export const PROVIDER_DEFAULT_URLS: Record<ProviderId, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai',
  ollama: 'http://localhost:11434',
  webgpu: '',
};

export const PROVIDER_MODELS_LIST: Record<ProviderId, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openrouter: [
    'meta-llama/llama-3-8b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemini-flash-1.5-exp:free',
    'mistralai/mistral-7b-instruct:free',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
  ],
  ollama: ['llama3', 'llama3.1', 'gemma2', 'phi3', 'mistral', 'qwen2'],
  webgpu: [
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    'gemma-2-2b-it-q4f16_1-MLC',
    'Phi-3.5-mini-instruct-q4f16_1-MLC',
  ],
};

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
      activeWorkspace: 'grammar',
      sidebarOpen: true,

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
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'omnibox-settings-v1',
    }
  )
)
