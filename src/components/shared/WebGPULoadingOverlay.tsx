import React from 'react'
import { Loader2 } from 'lucide-react'

interface WebGPULoadingOverlayProps {
  isLoading: boolean;
  selectedModel: string;
  loadPercent: number;
  speed: string;
  loadProgress: string;
}

export const WebGPULoadingOverlay: React.FC<WebGPULoadingOverlayProps> = ({
  isLoading,
  selectedModel,
  loadPercent,
  speed,
  loadProgress,
}) => {
  if (!isLoading) return null

  return (
    <div className="theme-panel rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium theme-text-strong">
          <Loader2 className="w-3.5 h-3.5 animate-spin theme-accent-text" />
          Loading WebGPU Model assets ({selectedModel})...
        </span>
        {speed && <span className="font-mono theme-text-muted">{speed}</span>}
      </div>
      <div className="w-full theme-panel-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 bg-[color:var(--app-accent)]"
          style={{ width: `${loadPercent}%` }}
        />
      </div>
      {loadProgress && (
        <p className="text-[10px] theme-text-faint font-mono leading-none">{loadProgress}</p>
      )}
    </div>
  )
}
