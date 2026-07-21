import { db, type HistoryItem } from '../../db/db'
import { documentRecordsRepository } from '../../repositories/libraryRepositories'
import { buildCareerReloadPayload, CAREER_RELOAD_KEY, parseCareerReloadPayload, type CareerHistoryRecord, type CareerResumeRecord } from './types'

const sortNewestFirst = <T extends { updatedAt: number; id?: number }>(records: readonly T[]): T[] =>
  [...records].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt
    return (right.id ?? 0) - (left.id ?? 0)
  })

const now = () => Date.now()

export const careerRepository = {
  reloadKey: CAREER_RELOAD_KEY,
  buildReloadPayload: buildCareerReloadPayload,
  parseReloadPayload: parseCareerReloadPayload,
  listSavedResumes: async (): Promise<CareerResumeRecord[]> => {
    const documents = await db.documents.toArray()
    return sortNewestFirst(documents.map((document) => ({
      id: document.id,
      name: document.name,
      content: document.content,
      updatedAt: document.timestamp,
    })))
  },
  saveResume: async (record: { name: string; content: string; source: 'paste' | 'file-import' }): Promise<void> => {
    const timestamp = now()
    const existing = await db.documents.where('name').equals(record.name).first()

    if (existing?.id) {
      await db.documents.update(existing.id, {
        name: record.name,
        content: record.content,
        timestamp,
      })
    } else {
      await db.documents.add({
        name: record.name,
        content: record.content,
        timestamp,
      })
    }

    await documentRecordsRepository.upsertByName({
      name: record.name,
      contentType: 'text/plain',
      content: record.content,
      source: record.source,
      createdAt: existing?.timestamp ?? timestamp,
      updatedAt: timestamp,
    })
  },
  deleteResume: async (name: string): Promise<void> => {
    await db.documents.where('name').equals(name).delete()
    await documentRecordsRepository.deleteByName(name)
  },
  listHistory: async (limit = 10): Promise<CareerHistoryRecord[]> =>
    db.history.where('workspaceId').equals('career').reverse().limit(limit).toArray(),
  recordHistory: async (entry: Omit<HistoryItem, 'id'>): Promise<void> => {
    await db.history.add(entry)
  },
}
