import React, { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { toolLoaders } from 'virtual:tool-loaders'
import type { RouteDescriptor } from '../../navigation'
import type { ToolId } from '../../tools/types'

const components = new Map(Object.entries(toolLoaders).map(([id, loader]) => [id, lazy(loader)]))

export const ToolLoadingState: React.FC = () => (
  <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-6" role="status" aria-live="polite" aria-label="Loading tool workspace">
    <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin text-indigo-400" /><span>Loading tool workspace…</span></div>
  </div>
)

interface ToolRoutePageProps { toolId: ToolId; onNavigate: (route: RouteDescriptor) => void }
export const ToolRoutePage: React.FC<ToolRoutePageProps> = ({ toolId, onNavigate }) => {
  const Component = components.get(toolId)
  if (!Component) return <section><h2>Tool unavailable</h2><button type="button" onClick={() => onNavigate({ view: 'tools' })}>Back to catalog</button></section>
  return <Suspense fallback={<ToolLoadingState />}><Component /></Suspense>
}
