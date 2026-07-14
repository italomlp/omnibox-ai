import {
  estimateTokensFromText,
  type CareerTaskInput,
  type ContextBudgetResult,
  type GrammarTaskInput,
  type InferenceTaskId,
  type ToneTaskInput,
} from './contracts'
import { getTaskSpec } from './taskSpecs'

export interface ContextBudgetOptions {
  contextWindowTokens: number
  safetyMarginTokens?: number
  reservedSystemTokens?: number
}

const DEFAULT_SAFETY_MARGIN_TOKENS = 128
const DEFAULT_SYSTEM_TOKENS = 256

function estimateTaskInputTokens(task: InferenceTaskId, input: GrammarTaskInput | ToneTaskInput | CareerTaskInput): number {
  switch (task) {
    case 'grammar':
      return estimateTokensFromText((input as GrammarTaskInput).text)
    case 'tone':
      return estimateTokensFromText((input as ToneTaskInput).text) + estimateTokensFromText(JSON.stringify((input as ToneTaskInput).profile))
    case 'gap-analysis': {
      const careerInput = input as CareerTaskInput
      return estimateTokensFromText(careerInput.resumeText) + estimateTokensFromText(careerInput.jobDescription)
    }
    default: {
      const _exhaustive: never = task
      return estimateTokensFromText(JSON.stringify(_exhaustive))
    }
  }
}

export function getTaskContextBudget(
  task: InferenceTaskId,
  input: GrammarTaskInput | ToneTaskInput | CareerTaskInput,
  options: ContextBudgetOptions,
): ContextBudgetResult {
  const spec = getTaskSpec(task)
  const reservedSystemTokens = options.reservedSystemTokens ?? DEFAULT_SYSTEM_TOKENS
  const reservedSafetyTokens = options.safetyMarginTokens ?? DEFAULT_SAFETY_MARGIN_TOKENS
  const reservedOutputTokens = spec.defaultMaxTokens
  const estimatedInputTokens = estimateTaskInputTokens(task, input)
  const availableInputTokens = Math.max(0, options.contextWindowTokens - reservedSystemTokens - reservedOutputTokens - reservedSafetyTokens)

  return {
    contextWindowTokens: options.contextWindowTokens,
    reservedSystemTokens,
    reservedOutputTokens,
    reservedSafetyTokens,
    estimatedInputTokens,
    availableInputTokens,
    fits: estimatedInputTokens <= availableInputTokens,
    overflowTokens: Math.max(0, estimatedInputTokens - availableInputTokens),
  }
}

export function canFitTaskInput(
  task: InferenceTaskId,
  input: GrammarTaskInput | ToneTaskInput | CareerTaskInput,
  options: ContextBudgetOptions,
): boolean {
  return getTaskContextBudget(task, input, options).fits
}

export function describeTaskBudget(
  task: InferenceTaskId,
  input: GrammarTaskInput | ToneTaskInput | CareerTaskInput,
  options: ContextBudgetOptions,
): string {
  const budget = getTaskContextBudget(task, input, options)

  if (budget.fits) {
    return `Input fits ${getTaskSpec(task).title}`
  }

  return `Input too large for selected model; shorten the input by about ${budget.overflowTokens} tokens.`
}
