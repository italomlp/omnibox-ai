import {
  type InferenceTaskId,
  type RetryAttemptPlan,
  type RetryPolicy,
  type ValidationFailure,
} from './contracts'
import { getTaskSpec } from './taskSpecs'
import { getValidationRepairHint } from './validateTaskResult'

export interface RetryPolicyOptions {
  allowLocalEscalation?: boolean
}

const TASK_MINIMUM_LOCAL_TIER: Record<InferenceTaskId, RetryPolicy['minimumLocalTier']> = {
  grammar: '1b',
  tone: '2b',
  'gap-analysis': '3b',
}

export function getTaskRetryPolicy(task: InferenceTaskId, options: RetryPolicyOptions = {}): RetryPolicy {
  const spec = getTaskSpec(task)

  return {
    task,
    attempts: spec.repairAttempts,
    minimumLocalTier: TASK_MINIMUM_LOCAL_TIER[task],
    allowLocalEscalation: options.allowLocalEscalation ?? false,
  }
}

export function getRetryAttempts(task: InferenceTaskId): readonly RetryAttemptPlan[] {
  return getTaskSpec(task).repairAttempts
}

export function buildRepairPromptFromFailure(task: InferenceTaskId, failure: ValidationFailure): string {
  return [
    `Task: ${task}`,
    getValidationRepairHint(failure),
    'Return only valid JSON with the exact contract.',
  ].join('\n')
}

export function shouldRetryValidation(failure: ValidationFailure): boolean {
  return failure.issues.length > 0
}
