import { ANDROID_LOCAL_INFERENCE_NOTE, isNativeAndroid, getProviderUnavailableReason } from '../../platform/runtime'
import React from 'react'
import { PROVIDER_MODELS_LIST } from '../../config/providers'
import type { ProviderId } from '../../config/providers'
import { WebLLMModelPicker } from './WebLLMModelPicker'

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
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3">
      <div className="flex min-w-0 flex-col gap-1 sm:w-auto">
        <label className="text-[10px] theme-text-faint font-semibold uppercase">Provider</label>
        <select
          disabled={availableProviders.length === 0}
          value={activeProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderId)}
          className="control-standard model-control min-w-0 h-9 w-full cursor-pointer rounded-md px-3 text-xs sm:w-56"
        >
          {availableProviders.map((prov) => (
            <option key={prov} value={prov} disabled={Boolean(getProviderUnavailableReason(prov))}>
              {prov === 'webgpu'
                ? 'Tier 1: WebGPU (Local)'
                : prov === 'ollama'
                ? 'Tier 2: Ollama (Local)'
                : `Tier 3: ${prov}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-0 flex-col gap-1 sm:w-auto">
        <label className="text-[10px] theme-text-faint font-semibold uppercase">Model</label>
        {activeProvider === 'webgpu' ? (
          <WebLLMModelPicker
            value={selectedModel}
            onChange={(model) => {
              onModelChange(model)
            }}
            menuMode="portal"
            className="w-full min-w-0 sm:max-w-[28rem]"
          />
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="control-standard model-control min-w-0 h-9 w-full cursor-pointer rounded-md px-3 text-xs sm:w-64"
          >
            {(() => {
              const list = PROVIDER_MODELS_LIST[activeProvider] || []
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
        )}
      </div>
      {isNativeAndroid() && <p className="w-full text-xs theme-text-muted">{availableProviders.length === 0 ? 'Privacy mode blocks cloud AI. ' : ''}{ANDROID_LOCAL_INFERENCE_NOTE}</p>}
    </div>
  )
}
