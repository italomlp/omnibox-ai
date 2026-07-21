import React from 'react'
import { ArrowRight, Layers3, LibraryBig, Settings2, Sparkles } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import { TOOL_CATEGORIES } from '../../tools/categories'
import { TOOL_REGISTRY } from '../../tools/registry'
import { getToolCategory } from '../../tools/getTool'
import { buildToolRoute } from '../tools/toolNavigation'

interface WorkbenchPageProps {
  onNavigate: (route: RouteDescriptor) => void
  privacyMode: boolean
  webGpuSupported: boolean | null
}

const quickStartTools = TOOL_REGISTRY.filter((tool) => tool.id === 'grammar-tone' || tool.id === 'career')

export const WorkbenchPage: React.FC<WorkbenchPageProps> = ({ onNavigate, privacyMode, webGpuSupported }) => {
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
        {quickStartTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onNavigate(buildToolRoute(tool.id))}
            className="group rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5 text-left transition hover:border-indigo-700/60 hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`Open ${tool.title}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h3 className="text-lg font-semibold text-zinc-50">{tool.title}</h3>
                <p className="text-sm leading-6 text-zinc-400">{tool.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-200" />
            </div>
            <div className="mt-4 inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {getToolCategory(tool.categoryId).title}
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: 'Pinned tools',
            body: 'Pinned shortcuts will appear here once favorites are enabled.',
            action: 'Browse catalog',
            route: { view: 'tools' } as RouteDescriptor,
          },
          {
            title: 'Recent tools',
            body: 'Recently used tools will populate this panel in a later phase.',
            action: 'Open workbench',
            route: { view: 'workbench' } as RouteDescriptor,
          },
          {
            title: 'Recent runs',
            body: 'Run history will surface here once execution records are wired in.',
            action: 'Open library',
            route: { view: 'library' } as RouteDescriptor,
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5">
            <h3 className="text-sm font-semibold text-zinc-100">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{card.body}</p>
            <button
              type="button"
              onClick={() => onNavigate(card.route)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              {card.action}
            </button>
          </div>
        ))}
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
