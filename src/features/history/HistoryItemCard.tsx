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
    <div className="glass-panel glass-panel-hover surface-nested flex min-w-0 flex-col justify-between space-y-3 rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-4">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
            isCareer 
              ? 'bg-indigo-950/40 border border-indigo-900/40 text-indigo-400' 
              : 'bg-violet-950/40 border border-violet-900/40 text-violet-400'
          }`}>
            {isCareer ? <Briefcase className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
            {isCareer ? 'Career' : 'Grammar'}
          </span>
          <span className="min-w-0 text-[9px] text-zinc-500 font-mono break-words text-right">{dateStr}</span>
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-bold text-zinc-200">
            {formatToolName(log.toolId)}
          </h4>
          <p className="mt-0.5 break-words text-[9px] text-zinc-500 font-mono">
            {log.provider} ({log.model})
          </p>
        </div>

        <p className="break-words text-[11px] leading-relaxed text-zinc-400 line-clamp-3">
          {log.output}
        </p>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-zinc-900/40 pt-2">
        <button
          type="button"
          onClick={() => onDelete(log.id!)}
          className="button-icon text-zinc-500 hover:text-red-400"
          title="Delete log entry"
          aria-label="Delete log entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onReload(log)}
            className="button-secondary px-2 text-[10px] text-zinc-400 hover:text-indigo-400"
            aria-label="Reload this entry into the workspace"
          >
            Reload Inputs <ArrowRight className="w-3 h-3" />
          </button>
          
          <button
            type="button"
            onClick={() => onSelect(log)}
            className="button-secondary px-2 text-[10px] text-indigo-400 hover:text-indigo-300"
            aria-haspopup="dialog"
            aria-label="View history details"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
