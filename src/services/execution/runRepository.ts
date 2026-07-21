import { db, RUN_RECORD_SCHEMA_VERSION, type PersistedPayload, type RunExecution } from '../../db/db'
import type { ExecutionError } from './types'

export interface RunRecordInput {
  toolId: string
  toolVersion: number
  actionId?: string
  input: PersistedPayload
  execution: RunExecution
}

export interface RunRecordHandle {
  runId: number
  markRunning: (execution?: RunExecution) => Promise<void>
  updateExecution: (execution: RunExecution) => Promise<void>
  complete: (output: string, execution?: RunExecution) => Promise<void>
  fail: (error: ExecutionError, execution?: RunExecution) => Promise<void>
  cancel: (execution?: RunExecution) => Promise<void>
}

const now = () => Date.now()

const patchRun = async (runId: number, patch: Record<string, unknown>): Promise<void> => {
  await db.runs.update(runId, { ...patch, updatedAt: now() })
}

export const createRunRecord = async (input: RunRecordInput): Promise<RunRecordHandle> => {
  const createdAt = now()
  const runId = await db.runs.add({
    schemaVersion: RUN_RECORD_SCHEMA_VERSION,
    toolId: input.toolId,
    toolVersion: input.toolVersion,
    actionId: input.actionId,
    status: 'queued',
    input: input.input,
    execution: input.execution,
    createdAt,
    updatedAt: createdAt,
  })

  const baseUpdate = (execution?: RunExecution): Record<string, unknown> => {
    const update: Record<string, unknown> = {}
    if (execution) {
      update.execution = execution
    }

    return update
  }

  return {
    runId,
    markRunning: async (execution) => {
      await patchRun(runId, {
        status: 'running',
        ...baseUpdate(execution),
      })
    },
    updateExecution: async (execution) => {
      await patchRun(runId, {
        execution,
      })
    },
    complete: async (output, execution) => {
      await patchRun(runId, {
        status: 'completed',
        output,
        completedAt: now(),
        ...baseUpdate(execution),
      })
    },
    fail: async (error, execution) => {
      await patchRun(runId, {
        status: 'failed',
        error,
        completedAt: now(),
        ...baseUpdate(execution),
      })
    },
    cancel: async (execution) => {
      await patchRun(runId, {
        status: 'cancelled',
        completedAt: now(),
        ...baseUpdate(execution),
      })
    },
  }
}
