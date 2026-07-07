import React from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { PROVIDER_MODELS_LIST, PROVIDER_DEFAULT_URLS } from '../../config/providers'
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
  ]

  return (
    <div className="space-y-6">
      {/* Privacy Mode Banner */}
      <div className={`p-4 rounded-xl border transition-all duration-300 ${
        privacyMode 
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' 
          : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-400'
      }`}>
        <div className="flex items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacyMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-200">Privacy Hard-Drop Mode</h3>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-zinc-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
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

        <div className="grid gap-4">
          {providers.map((p) => {
            const isOllama = p.id === 'ollama'
            const isCloud = !isOllama
            const isConfigured = isOllama || apiKeys[p.id]
            
            return (
              <div 
                key={p.id} 
                className={`p-4 rounded-xl border transition-all duration-200 glass-panel ${
                  privacyMode && isCloud 
                    ? 'opacity-40 pointer-events-none select-none border-zinc-900/50' 
                    : 'border-zinc-800/40 hover:border-zinc-700/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isConfigured 
                        ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                        : 'bg-zinc-600'
                    }`} />
                    {p.name}
                  </h3>
                  
                  {/* Model Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-zinc-500">Model:</label>
                    <select
                      value={selectedModels[p.id]}
                      onChange={(e) => setSelectedModel(p.id, e.target.value)}
                      className="text-xs py-1 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {PROVIDER_MODELS_LIST[p.id].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* API Key Input */}
                  {p.hasKey && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                        <Key className="w-3 h-3" /> API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={apiKeys[p.id]}
                          onChange={(e) => setApiKey(p.id, e.target.value)}
                          placeholder={`Paste private ${p.name} API key`}
                          className="w-full text-xs py-2 pl-3 pr-10 rounded-lg glass-input text-zinc-300 font-mono"
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
                        className="w-full text-xs py-2 px-3 rounded-lg glass-input text-zinc-300 font-mono"
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
