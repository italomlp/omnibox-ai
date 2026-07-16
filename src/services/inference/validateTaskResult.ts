import {
  CAREER_REQUIREMENT_STATUSES,
  CAREER_TASK_ID,
  INFERENCE_CONTRACT_VERSION,
  type StrictJsonErrorCode,
  type CareerTaskContract,
  type CareerTaskInput,
  type CareerTaskRequirementContract,
  type GrammarTaskContract,
  type GrammarTaskInput,
  type InferenceTaskContract,
  type InferenceTaskId,
  type ToneTaskContract,
  type ToneTaskInput,
  type ValidationFailure,
  type ValidationIssue,
  type ValidationResult,
  estimateTokensFromText,
  isNonEmptyString,
  isPlainObject,
  normalizeEvidenceText,
  normalizeWhitespace,
} from './contracts'

const URL_RE = /https?:\/\/[^\s<>()]+/gi
const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g
const CURRENCY_RE = /[$€£¥]\s?\d[\d,]*(?:\.\d+)?/g
const NUMBER_RE = /\b\d+(?:[,.]\d+)?%?\b/g
const CODE_SPAN_RE = /`([^`]+)`/g
const NAMED_REFERENCE_RE = /\b(?:[A-Z][\w&.-]*)(?:\s+[A-Z][\w&.-]*)+\b/g

const MAX_GAP_REQUIREMENTS = 6

const createFailure = (error: string, issues: ValidationIssue[], rawText?: string): ValidationFailure => ({
  ok: false,
  error,
  issues,
  rawText,
})

const createIssue = (code: string, message: string, path?: string): ValidationIssue => ({
  code,
  message,
  path,
})

function createStrictJsonError(code: StrictJsonErrorCode, message: string): Error {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

export function parseStrictJsonObject(rawText: string): Record<string, unknown> {
  let trimmed = rawText.trim()

  if (!trimmed) {
    throw createStrictJsonError('empty_output', 'Output is empty.')
  }

  // Extract JSON content if wrapped in markdown fences
  if (trimmed.includes('```')) {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenceMatch) {
      trimmed = fenceMatch[1].trim()
    } else {
      trimmed = trimmed.replace(/```/g, '').trim()
    }
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
    throw createStrictJsonError('surrounding_text', 'Output must contain a valid JSON object.')
  }

  const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonCandidate)
  } catch {
    throw createStrictJsonError('malformed_json', 'Output is not valid JSON.')
  }

  if (!isPlainObject(parsed)) {
    throw createStrictJsonError('not_object', 'Output must be a single JSON object.')
  }

  return parsed
}

function parseTaskContract<TTask extends InferenceTaskId>(rawText: string, expectedTask: TTask): InferenceTaskContract {
  const parsed = parseStrictJsonObject(rawText)

  if (parsed.version !== INFERENCE_CONTRACT_VERSION) {
    throw createStrictJsonError('malformed_json', `Unsupported contract version: ${String(parsed.version)}.`)
  }

  if (parsed.task !== expectedTask) {
    throw createStrictJsonError('malformed_json', `Expected task "${expectedTask}" but received "${String(parsed.task)}".`)
  }

  return parsed as unknown as InferenceTaskContract
}

function isEmptyText(value: unknown): boolean {
  return !isNonEmptyString(value)
}

function getTextTokens(rawText: string): string[] {
  const tokens = rawText.match(URL_RE) ?? []
  const emails = rawText.match(EMAIL_RE) ?? []
  const currencies = rawText.match(CURRENCY_RE) ?? []
  const numbers = rawText.match(NUMBER_RE) ?? []
  const codeSpans = [...rawText.matchAll(CODE_SPAN_RE)].map((match) => match[1])
  const names = rawText.match(NAMED_REFERENCE_RE) ?? []

  return [...tokens, ...emails, ...currencies, ...numbers, ...codeSpans, ...names]
    .map((token) => normalizeWhitespace(token))
    .filter((token, index, list) => list.indexOf(token) === index)
}

function validatePreservedTokens(sourceText: string, outputText: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sourceTokens = getTextTokens(sourceText)

  for (const token of sourceTokens) {
    if (!token) {
      continue
    }

    if (!outputText.includes(token)) {
      issues.push(createIssue('token_mismatch', `Required reference token was not preserved: ${token}`))
    }
  }

  return issues
}

function validateReasonableLengthRatio(inputText: string, outputText: string, minRatio: number, maxRatio: number): ValidationIssue[] {
  const inputLength = normalizeWhitespace(inputText).length
  const outputLength = normalizeWhitespace(outputText).length

  if (!inputLength || !outputLength) {
    return []
  }

  const ratio = outputLength / inputLength
  if (ratio < minRatio || ratio > maxRatio) {
    return [createIssue('length_ratio', `Output length ratio ${ratio.toFixed(2)} is outside the expected range.`)]
  }

  return []
}

function validateTextContract(
  rawText: string,
  expectedTask: 'grammar' | 'tone',
  inputText: string,
  ratioBounds: { min: number; max: number },
): ValidationResult<GrammarTaskContract | ToneTaskContract> {
  try {
    const parsed = parseTaskContract(rawText, expectedTask)

    if (expectedTask === 'grammar') {
      if (isEmptyText((parsed as GrammarTaskContract).text)) {
        return createFailure('Grammar output must include non-empty text.', [createIssue('missing_text', 'The corrected text is empty.', 'text')], rawText)
      }
    }

    if (expectedTask === 'tone') {
      if (isEmptyText((parsed as ToneTaskContract).text)) {
        return createFailure('Tone output must include non-empty text.', [createIssue('missing_text', 'The rewritten text is empty.', 'text')], rawText)
      }
    }

    const outputText = (parsed as GrammarTaskContract | ToneTaskContract).text
    const issues = [
      ...validateReasonableLengthRatio(inputText, outputText, ratioBounds.min, ratioBounds.max),
      ...validatePreservedTokens(inputText, outputText),
    ]

    if (issues.length > 0) {
      return createFailure('Validated text did not preserve required source content.', issues, rawText)
    }

    return { ok: true, value: parsed as GrammarTaskContract | ToneTaskContract }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate text contract.'
    return createFailure(message, [createIssue('parse_error', message)], rawText)
  }
}

function normalizeRequirementText(value: string): string {
  return normalizeEvidenceText(value)
}

function collectCareerRequirementIssues(
  requirement: CareerTaskRequirementContract,
  resumeText: string,
  jobDescription: string,
  requirementIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const path = `requirements[${requirementIndex}]`

  if (!isNonEmptyString(requirement.requirement)) {
    issues.push(createIssue('missing_requirement', 'Requirement text is empty.', `${path}.requirement`))
  }

  if (!CAREER_REQUIREMENT_STATUSES.includes(requirement.status)) {
    issues.push(createIssue('invalid_status', `Unsupported status: ${String(requirement.status)}`, `${path}.status`))
  }

  if (!Array.isArray(requirement.resumeEvidence)) {
    issues.push(createIssue('invalid_evidence', 'resumeEvidence must be an array.', `${path}.resumeEvidence`))
  } else {
    const normalizedEvidence = new Set<string>()

    for (const [evidenceIndex, evidence] of requirement.resumeEvidence.entries()) {
      if (!isNonEmptyString(evidence)) {
        issues.push(createIssue('invalid_evidence', 'Evidence entries must be non-empty strings.', `${path}.resumeEvidence[${evidenceIndex}]`))
        continue
      }

      const normalized = normalizeEvidenceText(evidence)
      if (normalizedEvidence.has(normalized)) {
        issues.push(createIssue('duplicate_evidence', 'Duplicate evidence entry found.', `${path}.resumeEvidence[${evidenceIndex}]`))
      }
      normalizedEvidence.add(normalized)

      if (!normalizeEvidenceText(resumeText).includes(normalized)) {
        issues.push(createIssue('evidence_not_grounded', 'Evidence must be an exact quote from the resume.', `${path}.resumeEvidence[${evidenceIndex}]`))
      }
    }
  }

  if (!isNonEmptyString(requirement.recommendation)) {
    issues.push(createIssue('missing_recommendation', 'Recommendation text is empty.', `${path}.recommendation`))
  }

  if (!isNonEmptyString(requirement.requirement)) {
    return issues
  }

  const normalizedRequirement = normalizeRequirementText(requirement.requirement)
  if (!normalizeEvidenceText(jobDescription).includes(normalizedRequirement)) {
    issues.push(createIssue('requirement_not_grounded', 'Requirement text should be grounded in the job description.', `${path}.requirement`))
  }

  if (requirement.status === 'match' && Array.isArray(requirement.resumeEvidence) && requirement.resumeEvidence.length === 0) {
    issues.push(createIssue('match_without_evidence', 'match requires at least one resume evidence quote.', `${path}.status`))
  }

  return issues
}

function validateCareerContract(rawText: string, input: CareerTaskInput): ValidationResult<CareerTaskContract> {
  try {
    const parsed = parseTaskContract(rawText, CAREER_TASK_ID) as CareerTaskContract

    if (!isNonEmptyString(parsed.summary)) {
      return createFailure('Career summary must be non-empty.', [createIssue('missing_summary', 'Summary is empty.', 'summary')], rawText)
    }

    if (!Array.isArray(parsed.requirements)) {
      return createFailure('Career requirements must be an array.', [createIssue('invalid_requirements', 'requirements must be an array.', 'requirements')], rawText)
    }

    if (parsed.requirements.length > MAX_GAP_REQUIREMENTS) {
      return createFailure('Career requirements exceed the bounded row limit.', [createIssue('too_many_rows', `At most ${MAX_GAP_REQUIREMENTS} requirements are allowed.`, 'requirements')], rawText)
    }

    const issues: ValidationIssue[] = []
    const requirementSignatures = new Set<string>()

    for (const [index, requirement] of parsed.requirements.entries()) {
      if (!isPlainObject(requirement)) {
        issues.push(createIssue('invalid_requirement', 'Requirement row must be an object.', `requirements[${index}]`))
        continue
      }

      const row = requirement as unknown as CareerTaskRequirementContract
      const rowIssues = collectCareerRequirementIssues(row, input.resumeText, input.jobDescription, index)
      issues.push(...rowIssues)

      const signature = normalizeRequirementText(row.requirement)
      if (signature) {
        if (requirementSignatures.has(signature)) {
          issues.push(createIssue('duplicate_requirement', 'Duplicate requirement row found.', `requirements[${index}].requirement`))
        }
        requirementSignatures.add(signature)
      }
    }

    if (issues.length > 0) {
      return createFailure('Career contract failed validation.', issues, rawText)
    }

    return { ok: true, value: parsed as CareerTaskContract }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate career contract.'
    return createFailure(message, [createIssue('parse_error', message)], rawText)
  }
}

export function validateGrammarTaskResult(rawText: string, input: GrammarTaskInput): ValidationResult<GrammarTaskContract> {
  return validateTextContract(rawText, 'grammar', input.text, { min: 0.6, max: 1.4 }) as ValidationResult<GrammarTaskContract>
}

export function validateToneTaskResult(rawText: string, input: ToneTaskInput): ValidationResult<ToneTaskContract> {
  return validateTextContract(rawText, 'tone', input.text, { min: 0.5, max: 1.8 }) as ValidationResult<ToneTaskContract>
}

export function validateCareerTaskResult(rawText: string, input: CareerTaskInput): ValidationResult<CareerTaskContract> {
  return validateCareerContract(rawText, input)
}

export function validateStrictTaskResult<TTask extends InferenceTaskId>(
  task: TTask,
  rawText: string,
  input: TTask extends 'grammar'
    ? GrammarTaskInput
    : TTask extends 'tone'
      ? ToneTaskInput
      : CareerTaskInput,
): ValidationResult<Extract<InferenceTaskContract, { task: TTask }>> {
  switch (task) {
    case 'grammar':
      return validateGrammarTaskResult(rawText, input as GrammarTaskInput) as ValidationResult<Extract<InferenceTaskContract, { task: TTask }>>
    case 'tone':
      return validateToneTaskResult(rawText, input as ToneTaskInput) as ValidationResult<Extract<InferenceTaskContract, { task: TTask }>>
    case 'gap-analysis':
      return validateCareerTaskResult(rawText, input as CareerTaskInput) as ValidationResult<Extract<InferenceTaskContract, { task: TTask }>>
    default: {
      const _exhaustive: never = task
      return createFailure(`Unsupported task: ${String(_exhaustive)}`, [createIssue('invalid_task', `Unsupported task: ${String(_exhaustive)}`)], rawText) as ValidationResult<Extract<InferenceTaskContract, { task: TTask }>>
    }
  }
}

export const summarizeValidationFailure = (failure: ValidationFailure): string => {
  const details = failure.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; ')
  return details ? `${failure.error} (${details})` : failure.error
}

export const getValidationRepairHint = (failure: ValidationFailure): string => {
  return [
    failure.error,
    ...failure.issues.map((issue) => `- ${issue.message}`),
    'Return only one JSON object.',
  ].join('\n')
}

export const estimateResultComplexity = (rawText: string): number => {
  return estimateTokensFromText(rawText)
}
