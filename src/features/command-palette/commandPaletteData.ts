import type { RouteDescriptor } from '../../navigation'
import { TOOL_CATEGORIES } from '../../tools/categories'
import { TOOL_REGISTRY } from '../../tools/registry'
import { buildToolRoute } from '../tools/toolNavigation'

export interface CommandPaletteItem {
  id: string
  title: string
  description: string
  route: RouteDescriptor
  groupTitle: string
  searchText: string
}

export interface CommandPaletteSection {
  id: string
  title: string
  items: CommandPaletteItem[]
}

const normalizeQuery = (value: string): string => value.trim().toLowerCase()

const createDestinationItems = (): CommandPaletteItem[] => [
  {
    id: 'destination-workbench',
    title: 'Workbench',
    description: 'Local control center and quick launch surface.',
    route: { view: 'workbench' },
    groupTitle: 'Destinations',
    searchText: 'workbench local control center quick launch surface',
  },
  {
    id: 'destination-tools',
    title: 'Tools',
    description: 'Browse the first-party tool catalog.',
    route: { view: 'tools' },
    groupTitle: 'Destinations',
    searchText: 'tools catalog browse first-party tool catalog',
  },
  {
    id: 'destination-library-runs',
    title: 'Library · Runs',
    description: 'Open canonical run history.',
    route: { view: 'library', section: 'runs' },
    groupTitle: 'Destinations',
    searchText: 'library runs canonical run history',
  },
  {
    id: 'destination-library-documents',
    title: 'Library · Documents',
    description: 'Open saved documents.',
    route: { view: 'library', section: 'documents' },
    groupTitle: 'Destinations',
    searchText: 'library documents saved documents',
  },
  {
    id: 'destination-library-artifacts',
    title: 'Library · Artifacts',
    description: 'Open saved artifacts.',
    route: { view: 'library', section: 'artifacts' },
    groupTitle: 'Destinations',
    searchText: 'library artifacts saved artifacts',
  },
  {
    id: 'destination-system',
    title: 'System',
    description: 'Privacy and provider controls.',
    route: { view: 'system' },
    groupTitle: 'Destinations',
    searchText: 'system privacy provider controls',
  },
]

const matchesQuery = (item: CommandPaletteItem, query: string): boolean => {
  if (!query) return true

  return `${item.title} ${item.description} ${item.searchText}`.toLowerCase().includes(query)
}

const buildToolSections = (query: string): CommandPaletteSection[] => TOOL_CATEGORIES.flatMap((category) => {
  const items = TOOL_REGISTRY.filter((tool) => tool.categoryId === category.id)
    .filter((tool) => matchesQuery({
      id: tool.id,
      title: tool.title,
      description: tool.description,
      route: buildToolRoute(tool.id),
      groupTitle: category.title,
      searchText: `${tool.title} ${tool.description} ${category.title} ${category.description}`,
    }, query))
    .map((tool) => ({
      id: tool.id,
      title: tool.title,
      description: tool.description,
      route: buildToolRoute(tool.id),
      groupTitle: category.title,
      searchText: `${tool.title} ${tool.description} ${category.title} ${category.description}`,
    }))

  return items.length > 0 ? [{ id: `category-${category.id}`, title: category.title, items }] : []
})

export const buildCommandPaletteSections = (query: string): CommandPaletteSection[] => {
  const normalizedQuery = normalizeQuery(query)
  const destinationItems = createDestinationItems().filter((item) => matchesQuery(item, normalizedQuery))

  return [
    destinationItems.length > 0 ? { id: 'destinations', title: 'Destinations', items: destinationItems } : null,
    ...buildToolSections(normalizedQuery),
  ].filter((section): section is CommandPaletteSection => section !== null)
}
