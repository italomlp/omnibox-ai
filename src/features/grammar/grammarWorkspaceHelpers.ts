import type { LocalGrammarDiagnostic, LocalGrammarResult } from './harperGrammar'

export type GrammarMode = 'local' | 'ai'

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
) => suggestion.apply()

export const shouldShowGrammarProviderControls = (mode: GrammarMode): boolean => mode === 'ai'

export const shouldApplyInferenceResult = (
  executionInputRevision: number,
  currentInputRevision: number,
): boolean => executionInputRevision === currentInputRevision
