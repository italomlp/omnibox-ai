import type { TOOL_CATALOG_DATA } from './catalog'

export type ToolId = (typeof TOOL_CATALOG_DATA)[number]['id']

export type ToolCategoryId = 'writing' | 'career' | 'developer' | 'audio'

export interface ToolCapabilityMetadata {
  acceptsDocuments: boolean
  supportsLocalExecution: boolean
  supportsCloudExecution: boolean
  supportsStreaming: boolean
  supportsArtifacts: boolean
}

export interface ToolActionDefinition {
  id: string
  title: string
  description: string
  default?: boolean
}

export interface ToolHistoryAdapter<THistoryRecord = unknown, TSummary = string, TDetail = string, TReloadPayload = unknown> {
  summarize: (record: THistoryRecord) => TSummary
  describe?: (record: THistoryRecord) => TDetail
  createReloadPayload?: (record: THistoryRecord) => TReloadPayload | null | undefined
}

export interface ToolArtifactAdapter<TArtifact = unknown, TSummary = string, TDetail = string> {
  summarize: (artifact: TArtifact) => TSummary
  describe?: (artifact: TArtifact) => TDetail
}

export interface ToolDefinition<THistoryRecord = unknown, TArtifact = unknown> {
  id: string
  version: number
  enabled: boolean
  quickStart: boolean
  legacyWorkspace?: string
  implementation: { folder: string; entry: string; export: string }
  title: string
  description: string
  categoryId: ToolCategoryId
  capabilities: ToolCapabilityMetadata
  actions?: readonly ToolActionDefinition[]
  historyAdapter?: ToolHistoryAdapter<THistoryRecord>
  artifactAdapter?: ToolArtifactAdapter<TArtifact>
}

export interface ToolCategoryDefinition {
  id: ToolCategoryId
  title: string
  description: string
}
