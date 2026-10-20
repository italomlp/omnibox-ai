import { ANDROID_LOCAL_INFERENCE_NOTE, isNativeAndroid } from '../../platform/runtime'
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
      {isNativeAndroid() && <div className="surface-nested rounded-xl p-4 text-sm theme-text-muted">
        <p>Android alpha: API keys stay in memory for this app session and are discarded on process restart. Previously saved keys are removed; documents and runs stay on this device.</p>
        <p className="mt-2">{ANDROID_LOCAL_INFERENCE_NOTE} Automatic provider fallback is disabled.</p>
      </div>}
      {/* Privacy Mode Banner */}
      <div className={`privacy-banner surface-nested min-w-0 rounded-xl p-3 transition-colors duration-300 sm:p-4 ${
        privacyMode ? 'status-pill-success shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' : 'theme-panel-muted'
      }`}>
        <div className="flex min-w-0 items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacyMode ? 'theme-success-text' : 'theme-text-faint'}`} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h3 className="font-semibold text-sm theme-text-strong">Privacy Hard-Drop Mode</h3>
              <label className="relative inline-flex items-center cursor-pointer select-none" htmlFor="privacy-mode-toggle">
                <input
                  id="privacy-mode-toggle"
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  aria-label="Toggle privacy hard-drop mode"
                  className="sr-only peer"
                />
                <div className="theme-switch-track h-6 w-10 rounded-full peer peer-focus:ring-0 after:content-[''] after:absolute after:start-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-zinc-400 after:transition-transform peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-transparent peer-checked:after:bg-white"></div>
              </label>
            </div>
            <p className="text-xs leading-relaxed theme-text-muted">
              {isNativeAndroid() ? 'Privacy mode blocks all cloud AI. Only bundled grammar, regex, and document parsing are available in the Android alpha.' : 'When enabled, OmniBox AI cuts off all cloud gateway requests. All utilities are forced to execute locally inside your browser sandbox using WebGPU (WebLLM) or localhost Ollama.'}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-nested min-w-0 rounded-xl p-3 sm:p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider theme-text-faint flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Local Model Policies
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="local-quality-policy" className="text-[10px] font-medium text-zinc-500">
              Preferred local quality
            </label>
            <select
              id="local-quality-policy"
              disabled={isNativeAndroid()}
              value={localQualityPolicy}
              onChange={(e) => setLocalQualityPolicy(e.target.value as LocalQualityPolicy)}
              className="glass-input control-touch w-full rounded-lg px-3 text-xs"
            >
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="quality">Quality</option>
            </select>
            <p className="text-[10px] leading-relaxed theme-text-faint">
              Auto lets the app choose a local model tier per task.
            </p>
          </div>

          <label className="flex min-w-0 items-start gap-3 rounded-lg theme-panel-muted p-3 text-sm">
            <input
              type="checkbox"
              disabled={isNativeAndroid()}
              checked={allowLocalModelEscalation}
              onChange={(e) => setAllowLocalModelEscalation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[color:var(--app-border)] bg-[color:var(--app-canvas)] text-[color:var(--app-accent)] focus:ring-[color:var(--app-accent)]"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium theme-text-strong">Allow local model escalation</span>
              <span className="block text-xs leading-relaxed theme-text-faint">
                Let the app step up to a larger compatible local model when a task needs more quality.
              </span>
            </span>
          </label>

          <label className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 text-sm ${
            privacyMode ? 'cursor-not-allowed theme-panel-muted theme-text-faint' : 'theme-panel-muted theme-text-strong'
          }`}>
            <input
              type="checkbox"
              disabled={isNativeAndroid() || privacyMode}
              checked={isNativeAndroid() ? false : allowCloudFallback}
              onChange={(e) => setAllowCloudFallback(e.target.checked)}
              aria-disabled={isNativeAndroid() || privacyMode}
              className="mt-0.5 h-4 w-4 rounded border-[color:var(--app-border)] bg-[color:var(--app-canvas)] text-[color:var(--app-accent)] focus:ring-[color:var(--app-accent)] disabled:cursor-not-allowed"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium theme-text-strong">Allow cloud fallback</span>
              <span className="block text-xs leading-relaxed theme-text-faint">
                Use a cloud provider when local execution cannot satisfy the request.
                {privacyMode ? ' Disabled while Privacy Hard-Drop Mode is on.' : ''}
              </span>
            </span>
          </label>

          <label className="flex min-w-0 items-start gap-3 rounded-lg theme-panel-muted p-3 text-sm">
            <input
              type="checkbox"
              disabled={isNativeAndroid()}
              checked={showRawModelDiagnostics}
              onChange={(e) => setShowRawModelDiagnostics(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[color:var(--app-border)] bg-[color:var(--app-canvas)] text-[color:var(--app-accent)] focus:ring-[color:var(--app-accent)]"
            />
            <span className="min-w-0 space-y-1">
              <span className="block font-medium theme-text-strong">Show raw model diagnostics</span>
              <span className="block text-xs leading-relaxed theme-text-faint">
                Reveal the detailed memory, context, and compatibility readout for WebLLM models.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider theme-text-faint flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> API & Model Providers
        </h2>

        <div className="grid min-w-0 gap-3 sm:gap-4">
          {providers.filter((provider) => !isNativeAndroid() || (provider.id !== 'webgpu' && provider.id !== 'ollama')).map((p) => {
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
                className={`settings-provider-card surface-nested min-w-0 rounded-xl p-3 transition-colors duration-200 sm:p-4 ${
                  privacyMode && isCloud 
                    ? 'privacy-provider-card opacity-55 pointer-events-none'
                    : 'hover:border-[color:var(--app-border-strong)]'
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 mb-3 pb-3 border-b border-[color:var(--app-border)] lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold theme-text-strong">
                    <span className={`w-2 h-2 rounded-full ${
                      isConfigured
                        ? 'bg-[color:var(--app-accent)] shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                        : 'bg-[color:var(--app-text-faint)]'
                    }`} />
                    <span className="min-w-0 truncate">{p.name}</span>
                  </h3>

                  {!isWebGPU ? (
                    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
                      <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
                        <label className="text-[10px] theme-text-faint font-semibold uppercase">Suggestion:</label>
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
                           className="model-control min-w-0 w-full cursor-pointer rounded-md px-2 text-xs sm:w-auto sm:max-w-56"
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
                        <label className="text-[10px] theme-text-faint font-semibold uppercase">Active ID:</label>
                        <input
                          type="text"
                          value={selectedModels[p.id] || ''}
                          onChange={(e) => setSelectedModel(p.id, e.target.value)}
                          placeholder="e.g. gpt-5-preview"
                           className="model-control min-w-0 w-full flex-1 rounded-md px-2.5 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {isWebGPU ? (
                  <div className="mb-3 space-y-3 rounded-xl theme-panel-muted p-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider theme-text-faint">
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
                      <p className="text-[10px] font-semibold uppercase tracking-wider theme-text-faint">Selected model ID</p>
                      <p className="min-w-0 whitespace-normal break-words rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-canvas)] px-3 py-2 font-mono text-xs leading-relaxed theme-text-strong select-text">
                        {_selectedWebLLMConfig?.modelId ?? PROVIDER_DEFAULT_MODELS.webgpu}
                      </p>
                    </div>
                  </div>
                ) : null}

                {isWebGPU && showRawModelDiagnostics && _selectedWebLLMConfig && (
                  <div className="mb-3 grid min-w-0 gap-2 text-[10px] theme-text-faint sm:grid-cols-3">
                    <div className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-canvas)] px-2.5 py-2">
                      <span className="block font-semibold uppercase theme-text-faint">Tier</span>
                      <span className="capitalize theme-text-strong">{_selectedWebLLMConfig.tier}</span>
                    </div>
                    <div className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-canvas)] px-2.5 py-2">
                      <span className="block font-semibold uppercase theme-text-faint">VRAM</span>
                      <span className="theme-text-strong">
                        {Math.ceil(_selectedWebLLMConfig.vramRequiredMB)} MB required
                      </span>
                    </div>
                    <div className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-canvas)] px-2.5 py-2">
                      <span className="block font-semibold uppercase theme-text-faint">Context</span>
                      <span className="theme-text-strong">
                        {_selectedWebLLMConfig.contextWindow.toLocaleString()} tokens
                      </span>
                    </div>
                    <p className="leading-relaxed theme-text-faint sm:col-span-3">
                      Recommended for {_selectedWebLLMConfig.recommendedFor.join(', ')}.
                      {_selectedWebLLMConfig.warning ? ` ${_selectedWebLLMConfig.warning}` : ''}
                    </p>
                  </div>
                )}

                {isWebGPU && !showRawModelDiagnostics && (
                  <p className="mb-3 text-[10px] leading-relaxed theme-text-faint">
                    Raw WebLLM diagnostics are hidden. Enable them above to view memory, context, and compatibility details.
                  </p>
                )}

                <div className="min-w-0 space-y-2.5">
                  {/* API Key Input */}
                  {p.hasKey && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium theme-text-faint flex items-center gap-1">
                        <Key className="w-3 h-3" /> API Key
                      </label>
                      <div className="relative min-w-0">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={apiKeys[p.id]}
                          onChange={(e) => setApiKey(p.id, e.target.value)}
                          placeholder={`Paste private ${p.name} API key`}
                           className="glass-input control-touch w-full min-w-0 rounded-lg pl-3 pr-12 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="button-icon absolute right-2 top-1 h-8 w-8 rounded-lg"
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
                      <label className="text-[10px] font-medium theme-text-faint flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Custom Base URL / Proxy
                      </label>
                      <input
                        type="text"
                        value={baseUrls[p.id]}
                        onChange={(e) => setBaseUrl(p.id, e.target.value)}
                        placeholder={`Endpoint URL (Default: ${PROVIDER_DEFAULT_URLS[p.id]})`}
                        className="glass-input control-touch w-full min-w-0 rounded-lg px-3 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {p.id === 'anthropic' && (
                  <p className="text-[10px] theme-text-faint mt-2.5 leading-relaxed">
                    💡 <strong>CORS Note:</strong> Anthropic's gateway blocks direct browser actions. To use Anthropic models, route through OpenRouter, or run a local CORS proxy tunnel and enter its address as the Base URL above.
                  </p>
                )}

                {p.id === 'ollama' && (
                  <p className="text-[10px] theme-text-faint mt-2.5 leading-relaxed">
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
