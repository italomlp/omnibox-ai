import type { ToolId } from '../tools/types'

export const LIBRARY_SECTIONS = ['runs', 'documents', 'artifacts', 'templates'] as const

export type LibrarySection = (typeof LIBRARY_SECTIONS)[number]

export type RouteDescriptor =
  | { view: 'workbench' }
  | { view: 'tools' }
  | { view: 'tool'; tool: ToolId }
  | { view: 'library'; section?: LibrarySection }
  | { view: 'system' }

export type RouteSource = 'canonical' | 'legacy' | 'invalid' | 'none'

export interface RouteResolution {
  route: RouteDescriptor
  source: RouteSource
  canonicalUrl: string
  shouldReplace: boolean
}
