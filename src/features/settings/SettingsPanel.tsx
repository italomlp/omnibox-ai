import React from 'react'
import { useSettingsStore, type LocalQualityPolicy } from '../../store/useSettingsStore'
import {
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_MODELS_LIST,
  PROVIDER_DEFAULT_URLS,
  WEBLLM_MODEL_CONFIG_BY_ID,
} from '../../config/providers'
import type { ProviderId } from '../../config/providers'
import { WebLLMModelPicker } from '../../components/shared/WebLLMModelPicker'
import { Key, Globe, Shield, Eye, EyeOff } from 'lucide-react'

export const SettingsPanel: React.FC = () => {
  const {
    apiKeys,
    baseUrls,
    selectedModels,
    privacyMode,
    localQualityPolicy,
    allowLocalModelEscalation,
    allowCloudFallback,
    showRawModelDiagnostics,
    setApiKey,
    setBaseUrl,
    setSelectedModel,
    setPrivacyMode,
    setLocalQualityPolicy,
    setAllowLocalModelEscalation,
    setAllowCloudFallback,
    setShowRawModelDiagnostics,
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
      <div className={`privacy-banner surface-nested min-w-0 rounded-xl border p-3 transition-colors duration-300 sm:p-4 ${
        privacyMode 
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' 
          : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-400'
      }`}>
        <div className="flex min-w-0 items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacyMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h3 className="font-semibold text-sm text-zinc-200">Privacy Hard-Drop Mode</h3>
              <label className="relative inline-flex items-center cursor-pointer select-none" htmlFor="privacy-mode-toggle">
                <input
                  id="privacy-mode-toggle"
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  aria-label="Toggle privacy hard-drop mode"
                  className="sr-only peer"
                />
                <div className="theme-switch-track h-6 w-10 rounded-full bg-zinc-800 peer peer-focus:ring-0 peer-checked:bg-emerald-500 after:content-[''] after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-zinc-400 after:transition-transform peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-transparent peer-checked:after:bg-white"></div>
              </label>
            </div>
            <p className="text-xs leading-relaxed">
              When enabled, OmniBox AI cuts off all cloud gateway requests. All utilities are forced to execute locally inside your browser sandbox using WebGPU (WebLLM) or localhost Ollama.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-nested min-w-0 rounded-xl border border-zinc-800/40 p-3 sm:p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Local Model Policies
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="local-quality-policy" className="text-[10px] font-medium text-zinc-500">
              Preferred local quality
            </label>
            <select
              id="local-quality-policy"
              value={localQualityPolicy}
              onChange={(e) => setLocalQualityPolicy(e.target.value as LocalQualityPolicy)}
              className="glass-input control-touch w-full rounded-lg px-3 text-xs text-zinc-300"
            >
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="quality">Quality</option>
            </select>
            <p className="text-[10px] leading-relaxed text-zinc-500">
              Auto lets the app choose a local model tier per task.
            </p>
          </div>

          <label className="flex min-w-0 items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={allowLocalModelEscalation}
              onChange={(e) => setAllowLocalModelEscalation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium text-zinc-200">Allow local model escalation</span>
              <span className="block text-xs leading-relaxed text-zinc-500">
                Let the app step up to a larger compatible local model when a task needs more quality.
              </span>
            </span>
          </label>

          <label className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 text-sm ${
            privacyMode ? 'cursor-not-allowed border-zinc-900/70 bg-zinc-950/20 text-zinc-500' : 'border-zinc-800/60 bg-zinc-950/40 text-zinc-300'
          }`}>
            <input
              type="checkbox"
              checked={allowCloudFallback}
              onChange={(e) => setAllowCloudFallback(e.target.checked)}
              disabled={privacyMode}
              aria-disabled={privacyMode}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium text-zinc-200">Allow cloud fallback</span>
              <span className="block text-xs leading-relaxed text-zinc-500">
                Use a cloud provider when local execution cannot satisfy the request.
                {privacyMode ? ' Disabled while Privacy Hard-Drop Mode is on.' : ''}
              </span>
            </span>
          </label>

          <label className="flex min-w-0 items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={showRawModelDiagnostics}
              onChange={(e) => setShowRawModelDiagnostics(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium text-zinc-200">Show raw model diagnostics</span>
              <span className="block text-xs leading-relaxed text-zinc-500">
                Reveal the detailed memory, context, and compatibility readout for WebLLM models.
              </span>
            </span>
          </label>
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
                className={`settings-provider-card surface-nested min-w-0 rounded-xl border p-3 transition-colors duration-200 sm:p-4 ${
                  privacyMode && isCloud 
                    ? 'privacy-provider-card opacity-55 pointer-events-none border-zinc-900/50'
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
                  
                  {!isWebGPU ? (
                    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
                      <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Suggestion:</label>
                        <select
                          value={
                            PROVIDER_MODELS_LIST[p.id].includes(selectedModels[p.id])
                              ? selectedModels[p.id]
                              : 'custom'
                          }
                          onChange={(e) => {
                            const val = e.target.value
                            if (val !== 'custom') {
                              setSelectedModel(p.id, val)
                            }
                          }}
                          className="model-control min-w-0 w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300 sm:w-auto sm:max-w-56"
                        >
                          {PROVIDER_MODELS_LIST[p.id].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                          <option value="custom">Custom (Type below)</option>
                        </select>
                      </div>

                      <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-1.5 lg:w-64">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Active ID:</label>
                        <input
                          type="text"
                          value={selectedModels[p.id] || ''}
                          onChange={(e) => setSelectedModel(p.id, e.target.value)}
                          placeholder="e.g. gpt-5-preview"
                          className="model-control min-w-0 w-full flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 font-mono"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {isWebGPU ? (
                  <div className="mb-3 space-y-3 rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Preferred WebLLM model
                      </label>
                      <WebLLMModelPicker
                        value={selectedModels.webgpu}
                        onChange={(model) => setSelectedModel('webgpu', model)}
                        className="w-full"
                        label="Preferred WebLLM model"
                        menuMode="flow"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Selected model ID</p>
                      <p className="min-w-0 whitespace-normal break-words rounded-lg border border-zinc-800/60 bg-zinc-950/70 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-300 select-text">
                        {_selectedWebLLMConfig?.modelId ?? PROVIDER_DEFAULT_MODELS.webgpu}
                      </p>
                    </div>
                  </div>
                ) : null}

                {isWebGPU && showRawModelDiagnostics && _selectedWebLLMConfig && (
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

                {isWebGPU && !showRawModelDiagnostics && (
                  <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
                    Raw WebLLM diagnostics are hidden. Enable them above to view memory, context, and compatibility details.
                  </p>
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
                          className="glass-input control-touch w-full min-w-0 rounded-lg pl-3 pr-12 text-xs text-zinc-300 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="button-icon absolute right-2 top-1 h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-300"
                          aria-label={showKeys[p.id] ? `Hide ${p.name} API key` : `Show ${p.name} API key`}
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
                        className="glass-input control-touch w-full min-w-0 rounded-lg px-3 text-xs text-zinc-300 font-mono"
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
