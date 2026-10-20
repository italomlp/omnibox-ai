import { isNativeAndroid } from '../../platform/runtime'
import React, { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import { TOOL_CATEGORIES } from '../../tools/categories'
import { TOOL_REGISTRY } from '../../tools/registry'
import { getToolCategory } from '../../tools/getTool'
import type { ToolCategoryId, ToolId } from '../../tools/types'
import { buildToolRoute } from './toolNavigation'

interface ToolsCatalogPageProps {
  onNavigate: (route: RouteDescriptor) => void
}

type CategoryFilter = ToolCategoryId | 'all'

export const ToolsCatalogPage: React.FC<ToolsCatalogPageProps> = ({ onNavigate }) => {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const filteredTools = useMemo(() => {
    const query = search.trim().toLowerCase()

    return TOOL_REGISTRY.filter((tool) => {
      const matchesCategory = categoryFilter === 'all' || tool.categoryId === categoryFilter
      const matchesSearch = !query
        || tool.title.toLowerCase().includes(query)
        || tool.description.toLowerCase().includes(query)
        || getToolCategory(tool.categoryId).title.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, search])

  const groupedTools = useMemo(
    () => TOOL_CATEGORIES.map((category) => ({
      ...category,
      tools: filteredTools.filter((tool) => tool.categoryId === category.id),
    })).filter((category) => category.tools.length > 0),
    [filteredTools],
  )

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Catalog
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Tools</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Browse first-party tools by category and open them from a keyboard-friendly catalog.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300">
            {filteredTools.length} tools
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools"
              aria-label="Search tools"
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                categoryFilter === 'all'
                  ? 'border-indigo-700 bg-indigo-950/40 text-indigo-200'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              All
            </button>
            {TOOL_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                aria-pressed={categoryFilter === category.id}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  categoryFilter === category.id
                    ? 'border-indigo-700 bg-indigo-950/40 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
      </header>

      {groupedTools.length > 0 ? (
        groupedTools.map((category) => (
          <section key={category.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{category.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">{category.description}</p>
              </div>
              <span className="text-xs text-zinc-500">{category.tools.length}</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {category.tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onNavigate(buildToolRoute(tool.id as ToolId))}
                  className="group rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 text-left transition hover:border-indigo-700/60 hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={`Open ${tool.title}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="text-base font-semibold text-zinc-50 transition group-hover:text-indigo-200">
                        {tool.title}
                      </div>
                      <p className="text-sm leading-6 text-zinc-400">{tool.description}</p>
                      {isNativeAndroid() && <p className="text-xs text-amber-300">{tool.id === 'speech-studio' ? 'Speech is disabled in the Android alpha. No microphone permission.' : tool.id === 'grammar-tone' || tool.id === 'regex-interpreter' ? 'Bundled local checking available. AI actions need a session cloud key with privacy mode off.' : 'AI actions need a session cloud key with privacy mode off. WebLLM and Ollama are disabled.'}</p>}
                    </div>

                    <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {getToolCategory(tool.categoryId).title}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    {tool.capabilities.supportsLocalExecution && (!isNativeAndroid() || tool.id === 'grammar-tone' || tool.id === 'regex-interpreter') ? <span className="rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2 py-1 text-emerald-300">Local</span> : null}
                    {tool.capabilities.supportsCloudExecution ? <span className="rounded-full border border-indigo-900/40 bg-indigo-950/20 px-2 py-1 text-indigo-300">Cloud</span> : null}
                    {tool.capabilities.supportsStreaming ? <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-300">Streaming</span> : null}
                    {tool.capabilities.supportsArtifacts ? <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-300">Artifacts</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-8 text-center text-sm text-zinc-400">
          No tools match this search.
        </div>
      )}
    </section>
  )
}
