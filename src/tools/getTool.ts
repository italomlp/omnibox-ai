import { TOOL_CATEGORIES, TOOL_CATEGORY_BY_ID } from './categories'
import { TOOL_REGISTRY, TOOL_REGISTRY_BY_ID } from './registry'
import type { ToolCategoryId, ToolId } from './types'

export const getTool = (toolId: ToolId) => TOOL_REGISTRY_BY_ID[toolId]

export const listTools = () => TOOL_REGISTRY

export const getToolCategory = (categoryId: ToolCategoryId) => TOOL_CATEGORY_BY_ID[categoryId]

export const listToolCategories = () => TOOL_CATEGORIES

export const hasTool = (toolId: ToolId) => Object.prototype.hasOwnProperty.call(TOOL_REGISTRY_BY_ID, toolId)
