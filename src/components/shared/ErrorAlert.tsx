import React from 'react'
import { AlertTriangle } from 'lucide-react'
import type { ProviderId } from '../../config/providers'

interface ErrorAlertProps {
  errorMsg: string | null;
  activeProvider: ProviderId;
  title?: string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  errorMsg,
  activeProvider,
  title = 'Execution Failed',
  onDismiss,
}) => {
  if (!errorMsg) return null

  return (
    <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-xs flex items-start gap-2.5 relative">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="space-y-1 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="leading-relaxed">{errorMsg}</p>
        
        {activeProvider === 'webgpu' && errorMsg.includes('maxStorageBuffersPerShaderStage') && (
          <div className="mt-2 p-2.5 rounded bg-zinc-950/40 border border-red-900/20 text-zinc-300 space-y-1.5">
            <p className="font-semibold text-yellow-500">⚠️ Hardware WebGPU Limits Exceeded</p>
            <p className="leading-normal text-[11px]">
              Your browser or graphics card limits WebGPU shader stages to <strong>8</strong> storage buffers, while this model requires <strong>10</strong>.
            </p>
            <p className="leading-normal text-[11px]">
              <strong>Recommended Action:</strong> Switch the provider to <strong>Tier 2: Ollama (Local)</strong> or <strong>Tier 3: Cloud BYOK</strong> (OpenRouter / OpenAI / Gemini).
            </p>
          </div>
        )}

        {activeProvider === 'ollama' && (
          <p className="mt-1.5 text-zinc-400">
            Ensure you launched Ollama with: <code>OLLAMA_ORIGINS="*" ollama serve</code>
          </p>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300 p-1 rounded"
        >
          &times;
        </button>
      )}
    </div>
  )
}
