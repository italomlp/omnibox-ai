import type { ToolCategoryDefinition, ToolCategoryId } from './types'

export const TOOL_CATEGORIES = [
  {
    id: 'writing',
    title: 'Writing',
    description: 'Grammar, tone, and future prompt tools.',
  },
  {
    id: 'career',
    title: 'Career',
    description: 'Resume and job-fit diagnostics.',
  },
  {
    id: 'developer',
    title: 'Developer',
    description: 'Code, schema, and regex utilities.',
  },
  {
    id: 'audio',
    title: 'Audio',
    description: 'Speech capture and generation tools.',
  },
] as const satisfies readonly ToolCategoryDefinition[]

export const TOOL_CATEGORY_BY_ID = Object.fromEntries(
  TOOL_CATEGORIES.map((category) => [category.id, category]),
) as Readonly<Record<ToolCategoryId, ToolCategoryDefinition>>
