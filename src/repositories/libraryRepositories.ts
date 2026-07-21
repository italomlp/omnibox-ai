import { db, type ArtifactRecord, type DocumentRecord, type RunRecord, type RunStatus } from '../db/db'

type WithCreatedAt = { createdAt: number; id?: number }

export interface RunQuery {
  toolId?: string
  status?: RunStatus
}

const sortNewestFirst = <T extends WithCreatedAt>(records: readonly T[]): T[] =>
  [...records].sort((left, right) => {
    if (right.createdAt !== left.createdAt) return right.createdAt - left.createdAt
    return (right.id ?? 0) - (left.id ?? 0)
  })

const filterRunRecords = (records: readonly RunRecord[], query?: RunQuery): RunRecord[] => {
  const filteredRecords = records.filter((record) => {
    if (query?.toolId && record.toolId !== query.toolId) return false
    if (query?.status && record.status !== query.status) return false
    return true
  })

  return sortNewestFirst(filteredRecords)
}

export const runsRepository = {
  list: async (query?: RunQuery): Promise<RunRecord[]> => {
    const records = await db.runs.toArray()
    return filterRunRecords(records, query)
  },
  get: async (id: number): Promise<RunRecord | undefined> => db.runs.get(id),
  delete: async (id: number): Promise<void> => { await db.runs.delete(id) },
  clear: async (): Promise<void> => { await db.runs.clear() },
}

export const documentRecordsRepository = {
  list: async (): Promise<DocumentRecord[]> => sortNewestFirst(await db.documentRecords.toArray()),
  get: async (id: number): Promise<DocumentRecord | undefined> => db.documentRecords.get(id),
  getByName: async (name: string): Promise<DocumentRecord | undefined> => {
    const matches = await db.documentRecords.toArray()
    return sortNewestFirst(matches.filter((record) => record.name === name))[0]
  },
  upsertByName: async (record: Omit<DocumentRecord, 'id' | 'schemaVersion' | 'legacy'>): Promise<void> => {
    const matches = await db.documentRecords.toArray()
    const existing = sortNewestFirst(matches.filter((item) => item.name === record.name))[0]

    if (existing?.id) {
      await db.documentRecords.update(existing.id, {
        ...record,
        schemaVersion: existing.schemaVersion,
        legacy: existing.legacy,
        createdAt: existing.createdAt,
        updatedAt: record.updatedAt,
      })
      return
    }

    await db.documentRecords.add({
      ...record,
      schemaVersion: 2,
    })
  },
  deleteByName: async (name: string): Promise<void> => {
    const matches = await db.documentRecords.toArray()
    const records = matches.filter((record) => record.name === name && typeof record.id === 'number')
    await Promise.all(records.map((record) => db.documentRecords.delete(record.id!)))
  },
  delete: async (id: number): Promise<void> => { await db.documentRecords.delete(id) },
  clear: async (): Promise<void> => { await db.documentRecords.clear() },
}

export const artifactsRepository = {
  list: async (): Promise<ArtifactRecord[]> => sortNewestFirst(await db.artifacts.toArray()),
  get: async (id: number): Promise<ArtifactRecord | undefined> => db.artifacts.get(id),
  delete: async (id: number): Promise<void> => { await db.artifacts.delete(id) },
  clear: async (): Promise<void> => { await db.artifacts.clear() },
}
