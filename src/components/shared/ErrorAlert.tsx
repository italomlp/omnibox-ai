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
    <div className="theme-panel-danger p-4 rounded-xl text-xs flex items-start gap-2.5 relative">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="space-y-1 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="leading-relaxed">{errorMsg}</p>
        
        {activeProvider === 'webgpu' && errorMsg.includes('maxStorageBuffersPerShaderStage') && (
          <div className="mt-2 p-2.5 rounded theme-panel-muted space-y-1.5">
            <p className="font-semibold theme-warning-text">⚠️ Hardware WebGPU Limits Exceeded</p>
            <p className="leading-normal text-[11px]">
              Your browser or graphics card limits WebGPU shader stages to <strong>8</strong> storage buffers, while this model requires <strong>10</strong>.
            </p>
            <p className="leading-normal text-[11px]">
              <strong>Recommended Action:</strong> Switch the provider to <strong>Tier 2: Ollama (Local)</strong> or <strong>Tier 3: Cloud BYOK</strong> (OpenRouter / OpenAI / Gemini).
            </p>
          </div>
        )}

        {activeProvider === 'ollama' && (
          <p className="mt-1.5 theme-text-muted">
            Ensure you launched Ollama with: <code>OLLAMA_ORIGINS="*" ollama serve</code>
          </p>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-2 top-2 theme-text-faint hover:text-[color:var(--app-text)] p-1 rounded"
        >
          &times;
        </button>
      )}
    </div>
  )
}
