import { TOOL_CATALOG_DATA } from './catalog'
import type { ToolDefinition, ToolId } from './types'

type RegisteredTool = ToolDefinition & { id: ToolId }

/** Metadata for all known tools remains available to display historical records. */
export const TOOL_CATALOG: readonly RegisteredTool[] = TOOL_CATALOG_DATA
export const TOOL_CATALOG_BY_ID = Object.fromEntries(TOOL_CATALOG.map((tool) => [tool.id, tool])) as Readonly<Record<string, RegisteredTool | undefined>>
/** Only tools enabled at build time may be navigated to or executed. */
export const TOOL_REGISTRY = TOOL_CATALOG.filter((tool) => tool.enabled)
export const TOOL_REGISTRY_BY_ID = Object.fromEntries(TOOL_REGISTRY.map((tool) => [tool.id, tool])) as Readonly<Record<string, RegisteredTool | undefined>>
