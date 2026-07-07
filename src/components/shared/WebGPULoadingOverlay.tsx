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
    <div className="p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/10 text-zinc-300 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          Loading WebGPU Model assets ({selectedModel})...
        </span>
        {speed && <span className="font-mono text-zinc-400">{speed}</span>}
      </div>
      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${loadPercent}%` }}
        />
      </div>
      {loadProgress && (
        <p className="text-[10px] text-zinc-500 font-mono leading-none">{loadProgress}</p>
      )}
    </div>
  )
}
