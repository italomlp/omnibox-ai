import React, { Suspense, lazy } from 'react'
import { ArrowLeft, ArrowUpRight, Loader2, Sparkles } from 'lucide-react'
import type { RouteDescriptor } from '../../navigation'
import type { ToolId } from '../../tools/types'
import { CareerWorkspace } from '../career/CareerWorkspace'
import { GrammarWorkspace } from '../grammar/GrammarWorkspace'
import { getToolMetadata } from './toolNavigation'

const TypeJsdocToolPage = lazy(() =>
  import('../type-jsdoc/TypeJsdocToolPage').then((module) => ({ default: module.TypeJsdocToolPage })),
)

const SchemaTranslatorToolPage = lazy(() =>
  import('../schema-translator/SchemaTranslatorToolPage').then((module) => ({ default: module.SchemaTranslatorToolPage })),
)

const RegexInterpreterToolPage = lazy(() =>
  import('../regex/RegexInterpreterToolPage').then((module) => ({ default: module.RegexInterpreterToolPage })),
)

const ToolLoadingState: React.FC = () => (
  <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-6" role="status" aria-live="polite" aria-label="Loading tool workspace">
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      <span>Loading tool workspace…</span>
    </div>
  </div>
)

interface ToolRoutePageProps {
  toolId: ToolId
  onNavigate: (route: RouteDescriptor) => void
}

export const ToolRoutePage: React.FC<ToolRoutePageProps> = ({ toolId, onNavigate }) => {
  if (toolId === 'grammar-tone') return <GrammarWorkspace />
  if (toolId === 'career') return <CareerWorkspace />

  if (toolId === 'type-jsdoc') {
    return (
      <Suspense fallback={<ToolLoadingState />}>
        <TypeJsdocToolPage />
      </Suspense>
    )
  }

  if (toolId === 'schema-translator') {
    return (
      <Suspense fallback={<ToolLoadingState />}>
        <SchemaTranslatorToolPage />
      </Suspense>
    )
  }

  if (toolId === 'regex-interpreter') {
    return (
      <Suspense fallback={<ToolLoadingState />}>
        <RegexInterpreterToolPage />
      </Suspense>
    )
  }

  let toolMetadata: ReturnType<typeof getToolMetadata> | null = null

  try {
    toolMetadata = getToolMetadata(toolId)
  } catch {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 md:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-900/40 bg-rose-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
              <Sparkles className="h-3.5 w-3.5" /> Unknown tool
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Tool unavailable</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                This tool is not registered in the current workspace.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ view: 'tools' })}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </button>
          </div>
        </div>
      </section>
    )
  }

  const { tool, category } = toolMetadata

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Coming soon
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">{tool.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{tool.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-300">
              {category.title}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Local execution', tool.capabilities.supportsLocalExecution],
            ['Cloud execution', tool.capabilities.supportsCloudExecution],
            ['Streaming', tool.capabilities.supportsStreaming],
            ['Artifacts', tool.capabilities.supportsArtifacts],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
              <div className={`mt-1 text-sm font-medium ${value ? 'text-emerald-300' : 'text-zinc-400'}`}>
                {value ? 'Supported' : 'Planned'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ view: 'tools' })}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'workbench' })}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-900/50 bg-indigo-950/30 px-3 py-2 text-sm font-medium text-indigo-200 transition hover:border-indigo-700 hover:bg-indigo-950/50"
          >
            Open workbench
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
