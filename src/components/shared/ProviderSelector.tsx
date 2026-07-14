import React from 'react'
import { PROVIDER_DEFAULT_MODELS, PROVIDER_MODELS_LIST } from '../../config/providers'
import type { ProviderId } from '../../config/providers'

interface ProviderSelectorProps {
  activeProvider: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableProviders: ProviderId[];
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  activeProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  availableProviders,
}) => {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-col space-y-1 sm:w-auto">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Provider</label>
        <select
          value={activeProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderId)}
          className="model-control min-w-0 w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500 sm:w-auto"
        >
          {availableProviders.map((prov) => (
            <option key={prov} value={prov}>
              {prov === 'webgpu'
                ? 'Tier 1: WebGPU (Local)'
                : prov === 'ollama'
                ? 'Tier 2: Ollama (Local)'
                : `Tier 3: ${prov}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-0 flex-col space-y-1 sm:w-auto">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Model</label>
        <select
          value={
            activeProvider === 'webgpu' && !PROVIDER_MODELS_LIST.webgpu.includes(selectedModel)
              ? PROVIDER_DEFAULT_MODELS.webgpu
              : selectedModel
          }
          onChange={(e) => onModelChange(e.target.value)}
          className="model-control min-w-0 w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer sm:w-auto sm:max-w-64"
        >
          {(() => {
            const list = PROVIDER_MODELS_LIST[activeProvider] || []
            if (activeProvider === 'webgpu') {
              return list
            }
            if (selectedModel && !list.includes(selectedModel)) {
              return [...list, selectedModel]
            }
            return list
          })().map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
