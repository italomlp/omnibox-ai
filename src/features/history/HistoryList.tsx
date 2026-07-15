import React from 'react'
import { Search, Sparkles, Briefcase, Trash2, SlidersHorizontal } from 'lucide-react'

interface HistoryListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedWorkspace: string;
  onWorkspaceChange: (workspace: string) => void;
  sortOrder: 'desc' | 'asc';
  onSortChange: (order: 'desc' | 'asc') => void;
  onClearHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  searchQuery,
  onSearchChange,
  selectedWorkspace,
  onWorkspaceChange,
  sortOrder,
  onSortChange,
  onClearHistory,
}) => {
  return (
    <div className="surface-nested space-y-4 rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-4">
      {/* Filtering Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search inputs, models, or generated results..."
            className="control-standard model-control w-full rounded-lg border border-zinc-800/60 bg-zinc-950/60 pl-9 pr-4 text-xs text-zinc-200"
            aria-label="Search history logs"
          />
        </div>

        {/* Sort & Settings */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as 'desc' | 'asc')}
              className="control-standard model-control h-9 cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-300"
              aria-label="Sort order"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <button
            onClick={onClearHistory}
            className="button-danger control-standard"
            title="Clear all history entries"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-stretch gap-2 border-t border-zinc-900/60 pt-3.5">
        <button
          onClick={() => onWorkspaceChange('all')}
          className={`control-standard inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold leading-none ${
            selectedWorkspace === 'all'
              ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/60'
              : 'border border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
          }`}
          aria-pressed={selectedWorkspace === 'all'}
        >
          All Activities
        </button>

        <button
          onClick={() => onWorkspaceChange('grammar')}
          className={`control-standard inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold leading-none ${
            selectedWorkspace === 'grammar'
              ? 'border border-violet-900/40 bg-violet-950/40 text-violet-400'
              : 'border border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
          }`}
          aria-pressed={selectedWorkspace === 'grammar'}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Grammar & Tone
        </button>

        <button
          onClick={() => onWorkspaceChange('career')}
          className={`control-standard inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold leading-none ${
            selectedWorkspace === 'career'
              ? 'border border-indigo-900/40 bg-indigo-950/40 text-indigo-400'
              : 'border border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
          }`}
          aria-pressed={selectedWorkspace === 'career'}
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          Career Suite
        </button>
      </div>
    </div>
  )
}
