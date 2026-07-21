import type { RunStatus } from '../../db/db'
import { getProviderLocality } from './providerCapabilities'
import type { ExecutionError, ExecutionLocality, ExecutionRequest } from './types'

export type RunLifecycleStatus = RunStatus

export interface RunLifecycleExecution {
  providerId: string
  modelId: string
  locality: ExecutionLocality
}

export interface RunLifecycleState<TInput = unknown, TOutput = unknown> {
  runId?: number
  toolId: string
  toolVersion: number
  actionId?: string
  status: RunLifecycleStatus
  input: TInput
  execution: RunLifecycleExecution
  output?: TOutput
  error?: ExecutionError
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  cancelledAt?: number
}

export type RunLifecycleAction<TOutput = unknown> =
  | {
      type: 'start'
      at?: number
    }
  | {
      type: 'complete'
      output: TOutput
      at?: number
    }
  | {
      type: 'cancel'
      at?: number
    }
  | {
      type: 'fail'
      error: ExecutionError
      at?: number
    }

const now = (value?: number) => value ?? Date.now()

const isTerminalStatus = (status: RunLifecycleStatus): boolean =>
  status === 'completed' || status === 'cancelled' || status === 'failed'

export const createQueuedRunState = <TInput = unknown, TOutput = unknown>(
  request: ExecutionRequest<TInput, TOutput>,
  at?: number,
): RunLifecycleState<TInput, TOutput> => {
  const timestamp = now(at)
  const locality = request.locality ?? getProviderLocality(request.providerId) ?? 'cloud'

  return {
    toolId: request.toolId,
    toolVersion: request.toolVersion,
    actionId: request.actionId,
    status: 'queued',
    input: request.input,
    execution: {
      providerId: request.providerId,
      modelId: request.modelId,
      locality,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const startRun = <TInput, TOutput>(
  state: RunLifecycleState<TInput, TOutput>,
  at?: number,
): RunLifecycleState<TInput, TOutput> => {
  if (state.status !== 'queued') return state

  const timestamp = now(at)

  return {
    ...state,
    status: 'running',
    startedAt: state.startedAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export const completeRun = <TInput, TOutput>(
  state: RunLifecycleState<TInput, TOutput>,
  output: TOutput,
  at?: number,
): RunLifecycleState<TInput, TOutput> => {
  if (isTerminalStatus(state.status)) return state

  const timestamp = now(at)
  const { error: _error, ...baseState } = state

  return {
    ...baseState,
    status: 'completed',
    output,
    completedAt: timestamp,
    updatedAt: timestamp,
  }
}

export const cancelRun = <TInput, TOutput>(
  state: RunLifecycleState<TInput, TOutput>,
  at?: number,
): RunLifecycleState<TInput, TOutput> => {
  if (isTerminalStatus(state.status)) return state

  const timestamp = now(at)

  return {
    ...state,
    status: 'cancelled',
    completedAt: timestamp,
    cancelledAt: timestamp,
    updatedAt: timestamp,
  }
}

export const failRun = <TInput, TOutput>(
  state: RunLifecycleState<TInput, TOutput>,
  error: ExecutionError,
  at?: number,
): RunLifecycleState<TInput, TOutput> => {
  if (isTerminalStatus(state.status)) return state

  const timestamp = now(at)

  return {
    ...state,
    status: 'failed',
    error,
    completedAt: timestamp,
    updatedAt: timestamp,
  }
}

export const runLifecycleReducer = <TInput, TOutput>(
  state: RunLifecycleState<TInput, TOutput>,
  action: RunLifecycleAction<TOutput>,
): RunLifecycleState<TInput, TOutput> => {
  switch (action.type) {
    case 'start':
      return startRun(state, action.at)
    case 'complete':
      return completeRun(state, action.output, action.at)
    case 'cancel':
      return cancelRun(state, action.at)
    case 'fail':
      return failRun(state, action.error, action.at)
    default:
      return state
  }
}

export const hasRunFinished = (status: RunLifecycleStatus): boolean => isTerminalStatus(status)
