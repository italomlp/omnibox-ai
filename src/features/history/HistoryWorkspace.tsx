import React, { useState, useEffect } from 'react'
import { History, Inbox } from 'lucide-react'
import { db, type HistoryItem } from '../../db/db'
import { useUIStore } from '../../store/useUIStore'
import { HistoryList } from './HistoryList'
import { HistoryItemCard } from './HistoryItemCard'
import { HistoryDetailPanel } from './HistoryDetailPanel'

const stringifyHistoryInput = (input: unknown): string => {
  if (typeof input === 'string') return input

  try {
    return JSON.stringify(input)
  } catch {
    return ''
  }
}

const stringifyHistoryInputForSearch = (input: unknown): string => {
  if (typeof input === 'string') return input

  try {
    return JSON.stringify(input)
  } catch {
    return '[unsearchable legacy input]'
  }
}

const parseObjectInput = (input: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(input)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

const buildCareerReloadPayload = (input: unknown): string => {
  if (typeof input !== 'string') {
    return stringifyHistoryInput(input)
  }

  const parsed = parseObjectInput(input)
  if (parsed) {
    return JSON.stringify({
      resume: typeof parsed.resume === 'string' ? parsed.resume : '',
      jobDesc: typeof parsed.jobDesc === 'string' ? parsed.jobDesc : '',
    })
  }

  return JSON.stringify({
    resume: input,
    jobDesc: '',
  })
}

export const HistoryWorkspace: React.FC = () => {
  const ui = useUIStore()
  
  // Database States
  const [logs, setLogs] = useState<HistoryItem[]>([])
  const [selectedLog, setSelectedLog] = useState<HistoryItem | null>(null)
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const fetchLogs = async () => {
    try {
      const allLogs = await db.history.toArray()
      setLogs(allLogs)
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this history entry?')) return
    try {
      await db.history.delete(id)
      fetchLogs()
      if (selectedLog?.id === id) {
        setSelectedLog(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('WARNING: This will permanently wipe your entire prompt activity history logs across all workspaces. Are you sure?')) return
    try {
      await db.history.clear()
      fetchLogs()
      setSelectedLog(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReload = (log: HistoryItem) => {
    // Write reload inputs to localStorage to decouple the workspace states
    if (log.workspaceId === 'career') {
      localStorage.setItem('omnibox-career-reload', buildCareerReloadPayload(log.input))
    } else {
      localStorage.setItem('omnibox-grammar-reload', stringifyHistoryInput(log.input))
    }

    // Redirect workspace view
    ui.setActiveWorkspace(log.workspaceId)
  }

  // Filter & Sort Computations
  const filteredLogs = logs
    .filter((log) => {
      // Workspace filter
      if (selectedWorkspace !== 'all' && log.workspaceId !== selectedWorkspace) {
        return false
      }
      
      // Text search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchInput = stringifyHistoryInputForSearch(log.input).toLowerCase().includes(query)
        const matchOutput = log.output.toLowerCase().includes(query)
        const matchModel = log.model.toLowerCase().includes(query)
        const matchTool = log.toolId.toLowerCase().includes(query)
        const matchProvider = log.provider.toLowerCase().includes(query)
        
        return matchInput || matchOutput || matchModel || matchTool || matchProvider
      }
      
      return true
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.timestamp - a.timestamp
      } else {
        return a.timestamp - b.timestamp
      }
    })

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/40 glass-panel">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Activity History & Logs
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review past outputs, inspect system prompts, and reload previous parameters back into your workspaces.
          </p>
        </div>
      </div>

      {/* Search and Filters List */}
      <HistoryList
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={setSelectedWorkspace}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        onClearHistory={handleClearAll}
      />

      {/* History Grid */}
      {filteredLogs.length > 0 ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLogs.map((log) => (
            <HistoryItemCard
              key={log.id}
              log={log}
              onSelect={setSelectedLog}
              onDelete={handleDelete}
              onReload={handleReload}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-zinc-800/40 bg-zinc-900/10 text-center space-y-3">
          <Inbox className="w-10 h-10 text-zinc-600" />
          <div>
            <h4 className="text-xs font-bold text-zinc-300">No prompt logs found</h4>
            <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xs leading-relaxed">
              {logs.length === 0
                ? "You haven't run any queries yet. Prompt outputs generated in Career Suite or Grammar Fixer will appear here."
                : 'No activities match your active search terms or category filter.'}
            </p>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      {selectedLog && (
        <HistoryDetailPanel
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onReload={handleReload}
        />
      )}
    </div>
  )
}
