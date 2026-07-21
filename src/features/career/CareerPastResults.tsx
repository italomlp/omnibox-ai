import React from 'react'
import { History } from 'lucide-react'
import { parseCareerGapResult, type CareerHistoryRecord } from './types'

interface CareerPastResultsProps {
  records: CareerHistoryRecord[]
  onReload: (record: CareerHistoryRecord) => void
}

export const CareerPastResults: React.FC<CareerPastResultsProps> = ({ records, onReload }) => {
  if (records.length === 0) return null

  return (
    <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
        <History className="w-4 h-4 text-zinc-500" /> Past Analysis Logs
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        {records.map((record) => {
          const parsedGap = record.toolId === 'gap-analysis' ? parseCareerGapResult(record.output) : null

          return (
            <div key={record.id} className="surface-nested space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">{record.toolId.replace('-', ' ')}</span>
                <span className="text-[9px] text-zinc-500">{new Date(record.timestamp).toLocaleDateString()}</span>
              </div>
              <p className="break-words text-[10px] leading-relaxed text-zinc-400 line-clamp-3">
                {parsedGap?.summary ?? record.output}
              </p>
              <button
                type="button"
                onClick={() => onReload(record)}
                className="button-secondary control-standard text-[9px] text-indigo-400 hover:text-indigo-300"
              >
                Reload result
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
