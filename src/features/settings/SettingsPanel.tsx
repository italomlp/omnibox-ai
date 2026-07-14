import React from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import {
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_MODELS_LIST,
  PROVIDER_DEFAULT_URLS,
  WEBLLM_MODEL_CONFIG_BY_ID,
} from '../../config/providers'
import type { ProviderId } from '../../config/providers'
import { Key, Globe, Shield, Eye, EyeOff } from 'lucide-react'

export const SettingsPanel: React.FC = () => {
  const {
    apiKeys,
    baseUrls,
    selectedModels,
    privacyMode,
    setApiKey,
    setBaseUrl,
    setSelectedModel,
    setPrivacyMode,
  } = useSettingsStore()

  const [showKeys, setShowKeys] = React.useState<Record<ProviderId, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
    openrouter: false,
    ollama: false,
    webgpu: false,
  })

  const toggleShowKey = (provider: ProviderId) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const providers: { id: ProviderId; name: string; hasKey: boolean; hasUrl: boolean }[] = [
    { id: 'openai', name: 'OpenAI', hasKey: true, hasUrl: true },
    { id: 'gemini', name: 'Google Gemini', hasKey: true, hasUrl: false },
    { id: 'openrouter', name: 'OpenRouter', hasKey: true, hasUrl: true },
    { id: 'anthropic', name: 'Anthropic Claude', hasKey: true, hasUrl: true },
    { id: 'ollama', name: 'Local Ollama (Daemon)', hasKey: false, hasUrl: true },
    { id: 'webgpu', name: 'Local WebGPU (WebLLM)', hasKey: false, hasUrl: false },
  ]

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Privacy Mode Banner */}
      <div className={`privacy-banner min-w-0 rounded-xl border p-3 transition-all duration-300 sm:p-4 ${
        privacyMode 
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' 
          : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-400'
      }`}>
        <div className="flex min-w-0 items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacyMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h3 className="font-semibold text-sm text-zinc-200">Privacy Hard-Drop Mode</h3>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="theme-switch-track w-10 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
              </label>
            </div>
            <p className="text-xs leading-relaxed">
              When enabled, OmniBox AI cuts off all cloud gateway requests. All utilities are forced to execute locally inside your browser sandbox using WebGPU (WebLLM) or localhost Ollama.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> API & Model Providers
        </h2>

        <div className="grid min-w-0 gap-3 sm:gap-4">
          {providers.map((p) => {
            const isOllama = p.id === 'ollama'
            const isWebGPU = p.id === 'webgpu'
            const isCloud = !isOllama && !isWebGPU
            const isConfigured = isOllama || isWebGPU || apiKeys[p.id]
            const _selectedWebLLMConfig = isWebGPU
              ? WEBLLM_MODEL_CONFIG_BY_ID[selectedModels.webgpu] ??
                WEBLLM_MODEL_CONFIG_BY_ID[PROVIDER_DEFAULT_MODELS.webgpu]
              : null
            
            return (
              <div 
                key={p.id} 
                className={`settings-provider-card min-w-0 rounded-xl border p-3 transition-all duration-200 sm:p-4 ${
                  privacyMode && isCloud 
                    ? 'privacy-provider-card opacity-55 pointer-events-none select-none border-zinc-900/50'
                    : 'border-zinc-800/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 mb-3 pb-3 border-b border-zinc-900/40 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className={`w-2 h-2 rounded-full ${
                      isConfigured 
                        ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                        : 'bg-zinc-600'
                    }`} />
                    <span className="min-w-0 truncate">{p.name}</span>
                  </h3>
                  
                  {/* Custom Model Selector Inputs */}
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
                    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase">Suggestion:</label>
                      <select
                        value={
                          PROVIDER_MODELS_LIST[p.id].includes(selectedModels[p.id])
                            ? selectedModels[p.id]
                            : isWebGPU
                            ? PROVIDER_DEFAULT_MODELS.webgpu
                            : 'custom'
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          if (val !== 'custom') {
                            setSelectedModel(p.id, val)
                          }
                        }}
                        className="model-control min-w-0 w-full text-xs py-1 px-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer sm:w-auto sm:max-w-56"
                      >
                        {PROVIDER_MODELS_LIST[p.id].map((m) => (
                          <option key={m} value={m}>
                            {isWebGPU
                              ? `${WEBLLM_MODEL_CONFIG_BY_ID[m]?.label ?? m} (${WEBLLM_MODEL_CONFIG_BY_ID[m]?.tier ?? 'local'})`
                              : m}
                          </option>
                        ))}
                        {!isWebGPU && <option value="custom">Custom (Type below)</option>}
                      </select>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-1.5 lg:w-64">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase">Active ID:</label>
                      {isWebGPU ? (
                        <code className="model-control min-w-0 w-full flex-1 truncate rounded-md border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 font-mono">
                          {_selectedWebLLMConfig?.modelId ?? PROVIDER_DEFAULT_MODELS.webgpu}
                        </code>
                      ) : (
                        <input
                          type="text"
                          value={selectedModels[p.id] || ''}
                          onChange={(e) => setSelectedModel(p.id, e.target.value)}
                          placeholder="e.g. gpt-5-preview"
                          className="model-control min-w-0 w-full flex-1 text-xs py-1 px-2.5 rounded-md bg-zinc-950 border border-zinc-850 text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {_selectedWebLLMConfig && (
                  <div className="mb-3 grid min-w-0 gap-2 text-[10px] text-zinc-400 sm:grid-cols-3">
                    <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-2.5 py-2">
                      <span className="block font-semibold uppercase text-zinc-500">Tier</span>
                      <span className="capitalize text-zinc-200">{_selectedWebLLMConfig.tier}</span>
                    </div>
                    <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-2.5 py-2">
                      <span className="block font-semibold uppercase text-zinc-500">VRAM</span>
                      <span className="text-zinc-200">
                        {Math.ceil(_selectedWebLLMConfig.vramRequiredMB)} MB required
                      </span>
                    </div>
                    <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-2.5 py-2">
                      <span className="block font-semibold uppercase text-zinc-500">Context</span>
                      <span className="text-zinc-200">
                        {_selectedWebLLMConfig.contextWindow.toLocaleString()} tokens
                      </span>
                    </div>
                    <p className="leading-relaxed text-zinc-500 sm:col-span-3">
                      Recommended for {_selectedWebLLMConfig.recommendedFor.join(', ')}.
                      {_selectedWebLLMConfig.warning ? ` ${_selectedWebLLMConfig.warning}` : ''}
                    </p>
                  </div>
                )}

                <div className="min-w-0 space-y-2.5">
                  {/* API Key Input */}
                  {p.hasKey && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                        <Key className="w-3 h-3" /> API Key
                      </label>
                      <div className="relative min-w-0">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={apiKeys[p.id]}
                          onChange={(e) => setApiKey(p.id, e.target.value)}
                          placeholder={`Paste private ${p.name} API key`}
                          className="w-full min-w-0 text-xs py-2 pl-3 pr-10 rounded-lg glass-input text-zinc-300 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="absolute right-2 top-1.5 p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showKeys[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Base URL Input */}
                  {p.hasUrl && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Custom Base URL / Proxy
                      </label>
                      <input
                        type="text"
                        value={baseUrls[p.id]}
                        onChange={(e) => setBaseUrl(p.id, e.target.value)}
                        placeholder={`Endpoint URL (Default: ${PROVIDER_DEFAULT_URLS[p.id]})`}
                        className="w-full min-w-0 text-xs py-2 px-3 rounded-lg glass-input text-zinc-300 font-mono"
                      />
                    </div>
                  )}
                </div>

                {p.id === 'anthropic' && (
                  <p className="text-[10px] text-zinc-500 mt-2.5 leading-relaxed">
                    💡 <strong>CORS Note:</strong> Anthropic's gateway blocks direct browser actions. To use Anthropic models, route through OpenRouter, or run a local CORS proxy tunnel and enter its address as the Base URL above.
                  </p>
                )}

                {p.id === 'ollama' && (
                  <p className="text-[10px] text-zinc-500 mt-2.5 leading-relaxed">
                    💡 <strong>CORS Note:</strong> Ensure Ollama is running with CORS enabled. Start the Ollama server in your terminal with: <code>OLLAMA_ORIGINS="*" ollama serve</code>.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
