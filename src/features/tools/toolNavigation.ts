import { getTool, getToolCategory } from '../../tools/getTool'
import type { ToolId } from '../../tools/types'
import type { LibrarySection, RouteDescriptor } from '../../navigation'

const LIBRARY_SECTION_LABELS: Record<LibrarySection, string> = {
  runs: 'Runs',
  documents: 'Documents',
  artifacts: 'Artifacts',
  templates: 'Templates',
}

export const buildToolRoute = (tool: ToolId): RouteDescriptor => ({ view: 'tool', tool })

export const getRouteTitle = (route: RouteDescriptor): string => {
  switch (route.view) {
    case 'workbench':
      return 'Workbench'
    case 'tools':
      return 'Tools'
    case 'library':
      return 'Library'
    case 'system':
      return 'System'
    case 'tool':
      return getTool(route.tool)?.title ?? 'Tool'
  }
}

export const getRouteSubtitle = (route: RouteDescriptor): string => {
  switch (route.view) {
    case 'workbench':
      return 'Local control center'
    case 'tools':
      return 'Browse the catalog'
    case 'library':
      return route.section ? LIBRARY_SECTION_LABELS[route.section] : 'Local records'
    case 'system':
      return 'Privacy and providers'
    case 'tool':
      return getToolCategory(getTool(route.tool).categoryId).title
  }
}

export const getToolMetadata = (toolId: ToolId) => {
  const tool = getTool(toolId)
  const category = getToolCategory(tool.categoryId)

  return {
    tool,
    category,
  }
}
