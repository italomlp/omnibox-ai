import React from 'react'
import { Sparkles, Briefcase, Trash2, ArrowRight } from 'lucide-react'
import type { HistoryItem } from '../../db/db'

interface HistoryItemCardProps {
  log: HistoryItem;
  onSelect: (log: HistoryItem) => void;
  onDelete: (id: number) => void;
  onReload: (log: HistoryItem) => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  log,
  onSelect,
  onDelete,
  onReload,
}) => {
  const isCareer = log.workspaceId === 'career'
  const dateStr = new Date(log.timestamp).toLocaleString()

  // Format the title of the tool
  const formatToolName = (toolId: string) => {
    return toolId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/30 glass-panel glass-panel-hover flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
            isCareer 
              ? 'bg-indigo-950/40 border border-indigo-900/40 text-indigo-400' 
              : 'bg-violet-950/40 border border-violet-900/40 text-violet-400'
          }`}>
            {isCareer ? <Briefcase className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
            {isCareer ? 'Career' : 'Grammar'}
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">{dateStr}</span>
        </div>

        <div>
          <h4 className="text-xs font-bold text-zinc-200">
            {formatToolName(log.toolId)}
          </h4>
          <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">
            {log.provider} ({log.model})
          </p>
        </div>

        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
          {log.output}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-900/40">
        <button
          onClick={() => onDelete(log.id!)}
          className="p-1.5 rounded-md hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors"
          title="Delete log entry"
          aria-label="Delete log entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReload(log)}
            className="text-[10px] text-zinc-400 hover:text-indigo-400 font-semibold px-2 py-1 rounded hover:bg-zinc-900/50 transition-all flex items-center gap-1"
          >
            Reload Inputs <ArrowRight className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => onSelect(log)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 bg-indigo-950/30 border border-indigo-900/40 rounded-lg hover:bg-indigo-950/50 transition-all"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
