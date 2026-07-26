import type { Lint, LintOptions, Suggestion, WorkerLinter } from 'harper.js'

export interface LocalGrammarSuggestion {
  replacement: string
  apply: () => Promise<string>
}

export interface LocalGrammarDiagnostic {
  id: string
  message: string
  suggestions: LocalGrammarSuggestion[]
}

export type LocalGrammarResult =
  | { status: 'ready'; diagnostics: LocalGrammarDiagnostic[] }
  | { status: 'stale' }
  | { status: 'unavailable'; stage: 'setup' | 'lint'; message: string }

type HarperLinter = Pick<WorkerLinter, 'setup' | 'lint' | 'applySuggestion' | 'dispose'>
type HarperLinterLoader = () => Promise<HarperLinter>

const LINT_OPTIONS: LintOptions = {
  language: 'plaintext',
  dedup: true,
}

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Local grammar checking is unavailable.'
}

const loadWorkerLinter: HarperLinterLoader = async () => {
  const [{ Dialect, WorkerLinter }, { binary }] = await Promise.all([
    import('harper.js'),
    import('harper.js/binary'),
  ])

  return new WorkerLinter({ binary, dialect: Dialect.American })
}

const mapDiagnostic = (
  id: string,
  text: string,
  lint: Lint,
  linter: HarperLinter,
): LocalGrammarDiagnostic => ({
  id,
  message: lint.message(),
  suggestions: lint.suggestions().map((suggestion: Suggestion) => ({
    replacement: suggestion.get_replacement_text(),
    apply: () => linter.applySuggestion(text, lint, suggestion),
  })),
})

export const createHarperGrammarService = (loadLinter: HarperLinterLoader = loadWorkerLinter) => {
  let linterPromise: Promise<HarperLinter> | undefined
  let requestId = 0

  const getLinter = async (): Promise<HarperLinter> => {
    linterPromise ??= loadLinter().then(async (linter) => {
      await linter.setup()
      return linter
    })

    try {
      return await linterPromise
    } catch (error) {
      linterPromise = undefined
      throw error
    }
  }

  const diagnose = async (text: string): Promise<LocalGrammarResult> => {
    const currentRequestId = ++requestId
    let linter: HarperLinter

    try {
      linter = await getLinter()
    } catch (error) {
      return currentRequestId === requestId
        ? { status: 'unavailable', stage: 'setup', message: getErrorMessage(error) }
        : { status: 'stale' }
    }

    try {
      const lints = await linter.lint(text, LINT_OPTIONS)
      if (currentRequestId !== requestId) {
        return { status: 'stale' }
      }

      return {
        status: 'ready',
        diagnostics: lints.map((lint, index) => mapDiagnostic(`${currentRequestId}:${index}`, text, lint, linter)),
      }
    } catch (error) {
      return currentRequestId === requestId
        ? { status: 'unavailable', stage: 'lint', message: getErrorMessage(error) }
        : { status: 'stale' }
    }
  }

  const dispose = async (): Promise<void> => {
    const activeLinter = linterPromise
    linterPromise = undefined
    requestId += 1
    await activeLinter?.then((linter) => linter.dispose())
  }

  return { diagnose, dispose }
}

export const harperGrammar = createHarperGrammarService()
