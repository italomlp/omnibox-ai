import Dexie, { type Table } from 'dexie'

export interface HistoryItem {
  id?: number
  workspaceId: string
  toolId: string
  timestamp: number
  input: unknown
  output: string
  provider: string
  model: string
}

export interface DocumentItem {
  id?: number
  name: string
  content: string
  timestamp: number
}

export type RunStatus = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'
export type RunLocality = 'webgpu' | 'localhost' | 'cloud'
export type LegacyRecordSource = 'history' | 'documents'

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

export interface UnavailablePayloadMarker {
  kind: 'unavailable-payload'
  source: string
  reason: string
  originalType: string
}

export type PersistedPayload = JsonValue | UnavailablePayloadMarker

export interface RunExecution {
  providerId: string
  modelId: string
  locality: RunLocality
}

export interface LegacyRunProvenance {
  kind: 'legacy-run'
  sourceTable: 'history'
  sourceId?: number
  workspaceId: string
  toolId: string
  providerId: string
  modelId: string
  timestamp: number
}

export interface LegacyDocumentProvenance {
  kind: 'legacy-document'
  sourceTable: 'documents'
  sourceId?: number
  name: string
  timestamp: number
}

export type LegacyProvenance = LegacyRunProvenance | LegacyDocumentProvenance

export const RUN_RECORD_SCHEMA_VERSION = 2 as const
export const DOCUMENT_RECORD_SCHEMA_VERSION = 2 as const
export const ARTIFACT_RECORD_SCHEMA_VERSION = 2 as const

export interface RunRecord {
  id?: number
  schemaVersion: typeof RUN_RECORD_SCHEMA_VERSION
  toolId: string
  toolVersion: number
  actionId?: string
  status: RunStatus
  input: PersistedPayload
  output?: string
  error?: {
    code: string
    message: string
  }
  execution: RunExecution
  createdAt: number
  updatedAt: number
  completedAt?: number
  legacy?: LegacyRunProvenance
}

export interface DocumentRecord {
  id?: number
  schemaVersion: typeof DOCUMENT_RECORD_SCHEMA_VERSION
  name: string
  contentType: string
  content: string
  source: 'paste' | 'file-import' | 'generated'
  createdAt: number
  updatedAt: number
  legacy?: LegacyDocumentProvenance
}

export interface ArtifactRecord {
  id?: number
  schemaVersion: typeof ARTIFACT_RECORD_SCHEMA_VERSION
  type: string
  title: string
  content: PersistedPayload
  sourceRunId?: number
  toolId: string
  createdAt: number
  legacy?: LegacyProvenance
}

const LEGACY_GRAMMAR_ACTION_IDS = new Set(['grammar', 'tone'])
const LEGACY_CAREER_ACTION_IDS = new Set(['ats-audit', 'semantic-suitability', 'gap-analysis'])

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeIdentifier = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : fallback
}

const describeRuntimeType = (value: unknown): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const createUnavailablePayloadMarker = (source: string, reason: string, value: unknown): UnavailablePayloadMarker => ({
  kind: 'unavailable-payload',
  source,
  reason,
  originalType: describeRuntimeType(value),
})

const cloneJsonValue = (value: unknown): JsonValue | null => {
  if (value === null) return null

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value as JsonValue
  }

  if (Array.isArray(value)) {
    const normalizedItems: JsonValue[] = []

    for (const item of value) {
      const normalizedItem = cloneJsonValue(item)
      if (normalizedItem === null && item !== null) return null
      normalizedItems.push(normalizedItem ?? null)
    }

    return normalizedItems
  }

  if (!isPlainObject(value)) return null

  const normalizedObject: JsonObject = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedNestedValue = cloneJsonValue(nestedValue)
    if (normalizedNestedValue === null && nestedValue !== null) return null
    normalizedObject[key] = normalizedNestedValue ?? null
  }

  return normalizedObject
}

const normalizePersistedPayload = (value: unknown, source: string, reason: string): PersistedPayload => {
  const normalizedValue = cloneJsonValue(value)
  return normalizedValue ?? createUnavailablePayloadMarker(source, reason, value)
}

const stringifyDisplayValue = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'

  try {
    const serializedValue = JSON.stringify(value, null, 2)
    return serializedValue ?? fallback
  } catch {
    return fallback
  }
}

const normalizeTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsedTimestamp = Number(value)
    if (Number.isFinite(parsedTimestamp)) return parsedTimestamp
  }

  return Date.now()
}

const normalizeRunExecution = (providerId: unknown, modelId: unknown): RunExecution => {
  const normalizedProviderId = normalizeIdentifier(providerId, 'unknown-provider')
  const normalizedModelId = normalizeIdentifier(modelId, 'unknown-model')

  return {
    providerId: normalizedProviderId,
    modelId: normalizedModelId,
    locality: normalizedProviderId === 'webgpu'
      ? 'webgpu'
      : normalizedProviderId === 'ollama'
        ? 'localhost'
        : 'cloud',
  }
}

const resolveLegacyToolContext = (workspaceId: unknown, toolId: unknown): { toolId: string; actionId?: string } => {
  const normalizedWorkspaceId = normalizeIdentifier(workspaceId, 'legacy')
  const normalizedToolId = normalizeIdentifier(toolId, 'legacy-tool')

  if (LEGACY_GRAMMAR_ACTION_IDS.has(normalizedToolId)) {
    return { toolId: 'grammar-tone', actionId: normalizedToolId }
  }

  if (LEGACY_CAREER_ACTION_IDS.has(normalizedToolId)) {
    return { toolId: 'career', actionId: normalizedToolId }
  }

  if (normalizedWorkspaceId === 'grammar') {
    return { toolId: 'grammar-tone' }
  }

  if (normalizedWorkspaceId === 'career') {
    return { toolId: 'career' }
  }

  return { toolId: normalizedToolId }
}

const normalizeLegacyRunRecord = (historyItem: HistoryItem): RunRecord => {
  const createdAt = normalizeTimestamp(historyItem.timestamp)
  const execution = normalizeRunExecution(historyItem.provider, historyItem.model)
  const { toolId, actionId } = resolveLegacyToolContext(historyItem.workspaceId, historyItem.toolId)

  return {
    schemaVersion: RUN_RECORD_SCHEMA_VERSION,
    toolId,
    toolVersion: 1,
    actionId,
    status: 'completed',
    input: normalizePersistedPayload(
      historyItem.input,
      'legacy-history-input',
      'Legacy history input payload was not JSON-safe.',
    ),
    output: stringifyDisplayValue(historyItem.output, '[Unable to display legacy output payload]'),
    execution,
    createdAt,
    updatedAt: createdAt,
    completedAt: createdAt,
    legacy: {
      kind: 'legacy-run',
      sourceTable: 'history',
      sourceId: historyItem.id,
      workspaceId: normalizeIdentifier(historyItem.workspaceId, 'legacy'),
      toolId: normalizeIdentifier(historyItem.toolId, 'legacy-tool'),
      providerId: execution.providerId,
      modelId: execution.modelId,
      timestamp: createdAt,
    },
  }
}

const normalizeLegacyDocumentRecord = (documentItem: DocumentItem): DocumentRecord => {
  const timestamp = normalizeTimestamp(documentItem.timestamp)

  return {
    schemaVersion: DOCUMENT_RECORD_SCHEMA_VERSION,
    name: normalizeIdentifier(documentItem.name, 'Untitled document'),
    contentType: 'text/plain',
    content: stringifyDisplayValue(documentItem.content, '[Unable to display legacy document payload]'),
    source: 'paste',
    createdAt: timestamp,
    updatedAt: timestamp,
    legacy: {
      kind: 'legacy-document',
      sourceTable: 'documents',
      sourceId: documentItem.id,
      name: normalizeIdentifier(documentItem.name, 'Untitled document'),
      timestamp,
    },
  }
}

export class OmniBoxDB extends Dexie {
  history!: Table<HistoryItem, number>
  documents!: Table<DocumentItem, number>
  runs!: Table<RunRecord, number>
  documentRecords!: Table<DocumentRecord, number>
  artifacts!: Table<ArtifactRecord, number>

  constructor() {
    super('OmniBoxDB')

    this.version(1).stores({
      history: '++id, workspaceId, toolId, timestamp',
      documents: '++id, name, timestamp',
    })

    this.version(2)
      .stores({
        history: '++id, workspaceId, toolId, timestamp',
        documents: '++id, name, timestamp',
        runs: '++id, toolId, status, createdAt, completedAt, [toolId+status], [toolId+createdAt], [status+createdAt]',
        documentRecords: '++id, contentType, source, createdAt, updatedAt',
        artifacts: '++id, toolId, sourceRunId, createdAt, [toolId+createdAt]',
      })
      .upgrade(async () => {
        const legacyHistoryItems = await this.history.toArray()
        const legacyDocumentItems = await this.documents.toArray()

        if (legacyHistoryItems.length > 0) {
          await this.runs.bulkAdd(legacyHistoryItems.map((historyItem) => normalizeLegacyRunRecord(historyItem)))
        }

        if (legacyDocumentItems.length > 0) {
          await this.documentRecords.bulkAdd(legacyDocumentItems.map((documentItem) => normalizeLegacyDocumentRecord(documentItem)))
        }
      })
  }
}

export const db = new OmniBoxDB()
