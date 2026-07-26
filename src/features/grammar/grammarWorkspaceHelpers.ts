import type { LocalGrammarDiagnostic, LocalGrammarResult } from './harperGrammar'

export type GrammarMode = 'local' | 'ai'

/** Delay local work while the user is actively typing. */
export const LOCAL_GRAMMAR_DEBOUNCE_MS = 350

export const dispatchGrammarCheck = async (
  mode: GrammarMode,
  text: string,
  diagnose: (source: string) => Promise<LocalGrammarResult>,
  runAiGrammar: () => Promise<void>,
): Promise<LocalGrammarResult | null> => {
  if (mode === 'local') {
    return diagnose(text)
  }

  await runAiGrammar()
  return null
}

export const applyLocalGrammarSuggestion = async (
  suggestion: LocalGrammarDiagnostic['suggestions'][number],
  currentText: string,
) => suggestion.apply(currentText)

export const shouldShowGrammarProviderControls = (mode: GrammarMode): boolean => mode === 'ai'

export const shouldApplyInferenceResult = (
  executionInputRevision: number,
  currentInputRevision: number,
  executionModeRevision: number,
  currentModeRevision: number,
): boolean => executionInputRevision === currentInputRevision
  && executionModeRevision === currentModeRevision

export const shouldApplyLocalGrammarResult = (
  requestId: number,
  activeRequestId: number,
  checkedInputRevision: number,
  currentInputRevision: number,
): boolean => requestId === activeRequestId && checkedInputRevision === currentInputRevision

export const shouldApplyLocalSuggestion = (
  diagnosticSourceText: string,
  currentInput: string,
  appliedInputRevision: number,
  currentInputRevision: number,
): boolean => diagnosticSourceText === currentInput && appliedInputRevision === currentInputRevision
