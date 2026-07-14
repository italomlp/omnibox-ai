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
    <div className="p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/30 glass-panel space-y-4">
      {/* Filtering Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search inputs, models, or generated results..."
            className="w-full text-xs py-2 pl-9 pr-4 rounded-lg bg-zinc-950/60 border border-zinc-850 text-zinc-200 focus:outline-none focus:border-indigo-500/50"
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
              className="text-xs bg-zinc-950 border border-zinc-800 rounded py-1 px-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              aria-label="Sort order"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <button
            onClick={onClearHistory}
            className="py-1 px-2.5 rounded bg-red-950/20 border border-red-900/30 hover:border-red-800 text-red-400 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Clear all history entries"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-900/60 pt-3.5">
        <button
          onClick={() => onWorkspaceChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedWorkspace === 'all'
              ? 'bg-zinc-800 text-indigo-400 border border-zinc-700/60'
              : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
          }`}
        >
          All Activities
        </button>

        <button
          onClick={() => onWorkspaceChange('grammar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            selectedWorkspace === 'grammar'
              ? 'bg-violet-950/40 text-violet-400 border border-violet-900/40'
              : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Grammar & Tone
        </button>

        <button
          onClick={() => onWorkspaceChange('career')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            selectedWorkspace === 'career'
              ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/40'
              : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Career Suite
        </button>
      </div>
    </div>
  )
}
