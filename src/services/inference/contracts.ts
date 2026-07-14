export const INFERENCE_CONTRACT_VERSION = 1 as const

export const INFERENCE_TASK_IDS = ['grammar', 'tone', 'gap-analysis'] as const

export type InferenceTaskId = (typeof INFERENCE_TASK_IDS)[number]

export const CAREER_TASK_ID = 'gap-analysis' as const

export const CAREER_REQUIREMENT_STATUSES = ['match', 'partial_gap', 'omission'] as const

export type CareerRequirementStatus = (typeof CAREER_REQUIREMENT_STATUSES)[number]

export interface GrammarTaskContract {
  version: typeof INFERENCE_CONTRACT_VERSION
  task: 'grammar'
  text: string
}

export interface ToneTaskContract {
  version: typeof INFERENCE_CONTRACT_VERSION
  task: 'tone'
  text: string
}

export interface CareerTaskRequirementContract {
  requirement: string
  status: CareerRequirementStatus
  resumeEvidence: string[]
  recommendation: string
}

export interface CareerTaskContract {
  version: typeof INFERENCE_CONTRACT_VERSION
  task: typeof CAREER_TASK_ID
  summary: string
  requirements: CareerTaskRequirementContract[]
}

export type InferenceTaskContract = GrammarTaskContract | ToneTaskContract | CareerTaskContract

export interface ToneProfile {
  diplomatic: number
  executive: number
  critical: number
  assertive: number
}

export interface GrammarTaskInput {
  text: string
}

export interface ToneTaskInput {
  text: string
  profile: ToneProfile
}

export interface CareerTaskInput {
  resumeText: string
  jobDescription: string
}

export interface ValidationIssue {
  code: string
  message: string
  path?: string
}

export interface ValidationSuccess<T> {
  ok: true
  value: T
}

export interface ValidationFailure {
  ok: false
  error: string
  issues: ValidationIssue[]
  rawText?: string
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export interface TaskPromptBundle {
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
  stopSequences: readonly string[]
}

export interface ContextBudgetResult {
  contextWindowTokens: number
  reservedSystemTokens: number
  reservedOutputTokens: number
  reservedSafetyTokens: number
  estimatedInputTokens: number
  availableInputTokens: number
  fits: boolean
  overflowTokens: number
}

export type RetryStage = 1 | 2

export interface RetryAttemptPlan {
  stage: RetryStage
  temperature: number
  maxTokens: number
  repairPrompt: boolean
}

export interface RetryPolicy {
  task: InferenceTaskId
  attempts: readonly RetryAttemptPlan[]
  minimumLocalTier: '1b' | '2b' | '3b'
  allowLocalEscalation: boolean
}

export interface StrictJsonParseError extends Error {
  code:
    | 'empty_output'
    | 'markdown_fence'
    | 'surrounding_text'
    | 'not_object'
    | 'malformed_json'
}

export type StrictJsonErrorCode = StrictJsonParseError['code']

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0
}

export const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

export const normalizeEvidenceText = (value: string): string => normalizeWhitespace(value).toLowerCase()

export const countWords = (value: string): number => {
  const matches = value.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

export const estimateTokensFromText = (value: string): number => {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }

  return Math.max(1, Math.ceil(trimmed.length / 4))
}

export const clampInteger = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.trunc(value)))
}
