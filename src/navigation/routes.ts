import { TOOL_REGISTRY_BY_ID } from '../tools/registry'
import type { ToolId } from '../tools/types'
import { LIBRARY_SECTIONS, type LibrarySection, type RouteDescriptor, type RouteResolution } from './types'

export const WORKBENCH_ROUTE: RouteDescriptor = { view: 'workbench' }

const NAVIGATION_PARAMETERS = ['view', 'tool', 'section', 'workspace'] as const

const LEGACY_WORKSPACE_ROUTES = {
  grammar: { view: 'tool', tool: 'grammar-tone' },
  career: { view: 'tool', tool: 'career' },
  history: { view: 'library', section: 'runs' },
  settings: { view: 'system' },
} as const satisfies Record<string, RouteDescriptor>

const isSingleParameter = (parameters: URLSearchParams, name: string): boolean =>
  parameters.getAll(name).length <= 1

export const isToolId = (value: unknown): value is ToolId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(TOOL_REGISTRY_BY_ID, value)

export const isLibrarySection = (value: unknown): value is LibrarySection =>
  typeof value === 'string' && LIBRARY_SECTIONS.includes(value as LibrarySection)

export const isRouteDescriptor = (value: unknown): value is RouteDescriptor => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const route = value as { view?: unknown; tool?: unknown; section?: unknown }
  const keys = Object.keys(route)

  switch (route.view) {
    case 'workbench':
    case 'tools':
    case 'system':
      return keys.length === 1 && keys[0] === 'view'
    case 'tool':
      return keys.length === 2 && keys.includes('view') && keys.includes('tool') && isToolId(route.tool)
    case 'library':
      return keys.length >= 1
        && keys.length <= 2
        && keys.includes('view')
        && keys.every((key) => key === 'view' || key === 'section')
        && (route.section === undefined || isLibrarySection(route.section))
    default:
      return false
  }
}

export const routesEqual = (left: RouteDescriptor, right: RouteDescriptor): boolean =>
  left.view === right.view
  && (left.view !== 'tool' || right.view !== 'tool' || left.tool === right.tool)
  && (left.view !== 'library' || right.view !== 'library' || left.section === right.section)

export const routeForLegacyWorkspace = (workspace: unknown): RouteDescriptor | null => {
  if (typeof workspace !== 'string') return null

  return LEGACY_WORKSPACE_ROUTES[workspace as keyof typeof LEGACY_WORKSPACE_ROUTES] ?? null
}

interface CanonicalRouteParseResult {
  route: RouteDescriptor
  valid: boolean
}

const parseCanonicalRoute = (parameters: URLSearchParams): CanonicalRouteParseResult | null => {
  const hasView = parameters.has('view')
  const hasTool = parameters.has('tool')
  const hasSection = parameters.has('section')

  if (!hasView && !hasTool && !hasSection) return null

  if (!NAVIGATION_PARAMETERS.slice(0, 3).every((name) => isSingleParameter(parameters, name))) {
    return { route: WORKBENCH_ROUTE, valid: false }
  }

  if (hasTool) {
    const tool = parameters.get('tool')
    return !hasView && !hasSection && isToolId(tool)
      ? { route: { view: 'tool', tool }, valid: true }
      : { route: WORKBENCH_ROUTE, valid: false }
  }

  const view = parameters.get('view')
  if (view === 'library') {
    const section = parameters.get('section')
    if (!hasSection) return { route: { view: 'library' }, valid: true }
    return isLibrarySection(section)
      ? { route: { view: 'library', section }, valid: true }
      : { route: WORKBENCH_ROUTE, valid: false }
  }

  return !hasSection && (view === 'workbench' || view === 'tools' || view === 'system')
    ? { route: { view }, valid: true }
    : { route: WORKBENCH_ROUTE, valid: false }
}

const relativeUrl = (url: URL): string => `${url.pathname}${url.search}${url.hash}`

export const buildRouteUrl = (route: RouteDescriptor, currentUrl: URL): string => {
  const url = new URL(currentUrl.href)
  const canonicalRoute = isRouteDescriptor(route) ? route : WORKBENCH_ROUTE

  for (const parameter of NAVIGATION_PARAMETERS) {
    url.searchParams.delete(parameter)
  }

  if (canonicalRoute.view === 'tool') {
    url.searchParams.set('tool', canonicalRoute.tool)
  } else {
    url.searchParams.set('view', canonicalRoute.view)
    if (canonicalRoute.view === 'library' && canonicalRoute.section) {
      url.searchParams.set('section', canonicalRoute.section)
    }
  }

  return relativeUrl(url)
}

export const resolveRoute = (currentUrl: URL): RouteResolution => {
  const parameters = currentUrl.searchParams
  const canonicalRoute = parseCanonicalRoute(parameters)

  if (canonicalRoute) {
    const canonicalUrl = buildRouteUrl(canonicalRoute.route, currentUrl)
    return {
      route: canonicalRoute.route,
      source: canonicalRoute.valid ? 'canonical' : 'invalid',
      canonicalUrl,
      shouldReplace: relativeUrl(currentUrl) !== canonicalUrl,
    }
  }

  if (!isSingleParameter(parameters, 'workspace')) {
    const canonicalUrl = buildRouteUrl(WORKBENCH_ROUTE, currentUrl)
    return { route: WORKBENCH_ROUTE, source: 'invalid', canonicalUrl, shouldReplace: relativeUrl(currentUrl) !== canonicalUrl }
  }

  if (parameters.has('workspace')) {
    const route = routeForLegacyWorkspace(parameters.get('workspace'))
    const canonicalUrl = buildRouteUrl(route ?? WORKBENCH_ROUTE, currentUrl)
    return {
      route: route ?? WORKBENCH_ROUTE,
      source: route ? 'legacy' : 'invalid',
      canonicalUrl,
      shouldReplace: relativeUrl(currentUrl) !== canonicalUrl,
    }
  }

  const canonicalUrl = buildRouteUrl(WORKBENCH_ROUTE, currentUrl)
  return { route: WORKBENCH_ROUTE, source: 'none', canonicalUrl, shouldReplace: false }
}
