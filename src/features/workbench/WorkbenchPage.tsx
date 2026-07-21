import React, { useMemo } from 'react'
import { ArrowRight, Layers3, LibraryBig, Pin, PinOff, Settings2, Sparkles } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import { TOOL_CATEGORIES } from '../../tools/categories'
import { TOOL_REGISTRY, TOOL_REGISTRY_BY_ID } from '../../tools/registry'
import { getToolCategory } from '../../tools/getTool'
import { useUIStore } from '../../store/useUIStore'
import type { ToolId } from '../../tools/types'
import { buildToolRoute } from '../tools/toolNavigation'

interface WorkbenchPageProps {
  onNavigate: (route: RouteDescriptor) => void
  privacyMode: boolean
  webGpuSupported: boolean | null
}

const quickStartTools = TOOL_REGISTRY.filter((tool) => tool.id === 'grammar-tone' || tool.id === 'career')

const resolveTool = (toolId: ToolId) => TOOL_REGISTRY_BY_ID[toolId]
const isDefined = <T,>(value: T | undefined): value is T => value !== undefined

const ToolCard: React.FC<{
  toolId: ToolId
  pinned: boolean
  onOpen: () => void
  onTogglePin: () => void
}> = ({ toolId, pinned, onOpen, onTogglePin }) => {
  const tool = resolveTool(toolId)

  if (!tool) return null

  const category = getToolCategory(tool.categoryId)

  return (
    <article className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 transition hover:border-zinc-700/70 hover:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <h3 className="truncate text-sm font-semibold text-zinc-50">{tool.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">{tool.description}</p>
        </button>

        <button
          type="button"
          onClick={onTogglePin}
          className="theme-icon-button rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label={pinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
          title={pinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {category.title}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

export const WorkbenchPage: React.FC<WorkbenchPageProps> = ({ onNavigate, privacyMode, webGpuSupported }) => {
  const pinnedToolIds = useUIStore((state) => state.pinnedToolIds)
  const recentToolIds = useUIStore((state) => state.recentToolIds)
  const togglePinnedTool = useUIStore((state) => state.togglePinnedTool)

  const pinnedTools = useMemo(
    () => pinnedToolIds.map((toolId) => TOOL_REGISTRY_BY_ID[toolId as ToolId]).filter(isDefined),
    [pinnedToolIds],
  )
  const recentTools = useMemo(
    () => recentToolIds
      .filter((toolId) => !pinnedToolIds.includes(toolId))
      .map((toolId) => TOOL_REGISTRY_BY_ID[toolId as ToolId])
      .filter(isDefined),
    [pinnedToolIds, recentToolIds],
  )

  const readinessItems = [
    {
      label: 'Privacy',
      value: privacyMode ? 'Local-only mode' : 'Cloud access allowed',
      tone: privacyMode ? 'emerald' : 'zinc',
    },
    {
      label: 'WebGPU',
      value: webGpuSupported === null ? 'Checking support' : webGpuSupported ? 'Available' : 'Unavailable',
      tone: webGpuSupported === false ? 'amber' : 'emerald',
    },
    {
      label: 'Catalog',
      value: `${TOOL_REGISTRY.length} tools registered`,
      tone: 'indigo',
    },
  ] as const

  const categorySummaries = TOOL_CATEGORIES.map((category) => ({
    ...category,
    count: TOOL_REGISTRY.filter((tool) => tool.categoryId === category.id).length,
  }))

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Workbench
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Developer workbench</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Start with focused tools, then move into the catalog, library, and system controls from one local-first shell.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate({ view: 'tools' })}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Layers3 className="h-4 w-4" />
              Tools
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'library' })}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <LibraryBig className="h-4 w-4" />
              Library
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'system' })}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <Settings2 className="h-4 w-4" />
              System
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          {quickStartTools.map((tool) => (
            <ToolCard
              key={tool.id}
              toolId={tool.id}
              pinned={pinnedToolIds.includes(tool.id)}
              onOpen={() => onNavigate(buildToolRoute(tool.id))}
              onTogglePin={() => togglePinnedTool(tool.id)}
            />
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Pinned tools</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">Keep preferred tools one click away.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'tools' })}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              Browse catalog
            </button>
          </div>

          <div className="space-y-3">
            {pinnedTools.length > 0 ? (
              pinnedTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  toolId={tool.id}
                  pinned
                  onOpen={() => onNavigate(buildToolRoute(tool.id))}
                  onTogglePin={() => togglePinnedTool(tool.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40 p-5 text-sm leading-6 text-zinc-400">
                Pin a tool from the workbench or command palette to save it here.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Recent tools</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">Recently opened tools stay cached for fast relaunch.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'tools' })}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            Open catalog
          </button>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {recentTools.length > 0 ? (
            recentTools.map((tool) => (
              <ToolCard
                key={tool.id}
                toolId={tool.id}
                pinned={false}
                onOpen={() => onNavigate(buildToolRoute(tool.id))}
                onTogglePin={() => togglePinnedTool(tool.id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40 p-5 text-sm leading-6 text-zinc-400 xl:col-span-2">
              Open a tool from the catalog, sidebar, or command palette to populate this list.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5">
          <h3 className="text-sm font-semibold text-zinc-100">Execution readiness</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {readinessItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{item.label}</div>
                <div
                  className={`mt-1 text-sm font-medium ${item.tone === 'emerald' ? 'text-emerald-300' : item.tone === 'amber' ? 'text-amber-300' : 'text-indigo-300'}`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5">
          <h3 className="text-sm font-semibold text-zinc-100">Catalog snapshot</h3>
          <div className="mt-4 space-y-3">
            {categorySummaries.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2.5">
                <div>
                  <div className="text-sm text-zinc-100">{category.title}</div>
                  <div className="text-xs text-zinc-500">{category.description}</div>
                </div>
                <div className="text-sm font-semibold text-zinc-300">{category.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
