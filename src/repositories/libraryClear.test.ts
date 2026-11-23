import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ records: [] as Array<{ toolId: string }>, clear: vi.fn() }))
vi.mock('../db/db', () => ({ db: { runs: { toArray: async () => mocks.records, clear: mocks.clear }, artifacts: { toArray: async () => mocks.records, clear: mocks.clear }, transaction: async (_mode: string, _table: unknown, callback: () => Promise<unknown>) => callback() } }))
import { runsRepository, artifactsRepository } from './libraryRepositories'

describe('transactional library clear', () => {
  it.each([runsRepository, artifactsRepository])('protects newly added disabled records', async (repository) => {
    mocks.clear.mockClear()
    mocks.records = [{ toolId: 'disabled' }]
    expect(await repository.clearIfAllowed((record) => record.toolId !== 'disabled')).toBe(false)
    expect(mocks.clear).not.toHaveBeenCalled()
    mocks.records = [{ toolId: 'enabled' }]
    expect(await repository.clearIfAllowed((record) => record.toolId !== 'disabled')).toBe(true)
    expect(mocks.clear).toHaveBeenCalledOnce()
  })
})
