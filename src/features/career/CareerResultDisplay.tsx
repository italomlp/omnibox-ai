import React from 'react'
import { Loader2 } from 'lucide-react'
import { GapAnalysisResult } from './GapAnalysisResult'
import { type CareerGapResult } from './types'

interface CareerResultDisplayProps {
  isProcessing: boolean
  output: string
  gapResult: CareerGapResult | null
}

export const CareerResultDisplay: React.FC<CareerResultDisplayProps> = ({ isProcessing, output, gapResult }) => (
  <div className="surface-nested flex min-h-[300px] flex-1 flex-col space-y-3 rounded-xl border border-zinc-800/40 p-4 min-w-0">
    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Analysis Output</h3>
    <div className="surface-nested relative flex-1 overflow-y-auto rounded-lg border border-zinc-800/60 p-4 text-xs text-zinc-300 font-sans leading-relaxed select-text break-words" aria-live="polite" aria-busy={isProcessing}>
      {isProcessing && !output && !gapResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30" role="status" aria-live="polite" aria-label="Generating analysis">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      )}
      {gapResult ? (
        <GapAnalysisResult result={gapResult} />
      ) : output ? (
        <div className="markdown-body space-y-3 whitespace-pre-wrap break-words select-text">{output}</div>
      ) : (
        <span className="text-zinc-600 italic">Select one of the diagnostic tools above to run evaluation streams...</span>
      )}
    </div>
  </div>
)
