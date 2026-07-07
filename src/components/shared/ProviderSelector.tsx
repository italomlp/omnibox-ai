import React from 'react'
import { PROVIDER_MODELS_LIST } from '../../config/providers'
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Provider</label>
        <select
          value={activeProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderId)}
          className="text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500"
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

      <div className="flex flex-col space-y-1">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500"
        >
          {PROVIDER_MODELS_LIST[activeProvider]?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
