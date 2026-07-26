import type { LocalGrammarDiagnostic } from './harperGrammar'

export interface DiagnosticSegment {
  text: string
  diagnostic?: LocalGrammarDiagnostic
}

const isCurrentDiagnostic = (diagnostic: LocalGrammarDiagnostic, value: string): boolean => {
  const { start, end } = diagnostic.range
  return diagnostic.sourceText === value
    && Number.isSafeInteger(start)
    && Number.isSafeInteger(end)
    && start >= 0
    && start < end
    && end <= value.length
}

/**
 * Splits current text into safe, non-overlapping diagnostic segments for the
 * aria-hidden visual layer. Ranges have already been converted to UTF-16 by
 * the Harper service, so they match native textarea string offsets.
 */
export const buildDiagnosticSegments = (
  value: string,
  diagnostics: LocalGrammarDiagnostic[],
): DiagnosticSegment[] => {
  const segments: DiagnosticSegment[] = []
  const sortedDiagnostics = diagnostics
    .filter((diagnostic) => isCurrentDiagnostic(diagnostic, value))
    .sort((left, right) => left.range.start - right.range.start || left.range.end - right.range.end)

  let cursor = 0
  for (const diagnostic of sortedDiagnostics) {
    if (diagnostic.range.start < cursor) continue

    if (cursor < diagnostic.range.start) {
      segments.push({ text: value.slice(cursor, diagnostic.range.start) })
    }

    segments.push({
      text: value.slice(diagnostic.range.start, diagnostic.range.end),
      diagnostic,
    })
    cursor = diagnostic.range.end
  }

  if (cursor < value.length || segments.length === 0) {
    segments.push({ text: value.slice(cursor) })
  }

  return segments
}

export const getCurrentDiagnostics = (
  diagnostics: LocalGrammarDiagnostic[],
  value: string,
): LocalGrammarDiagnostic[] => diagnostics.filter((diagnostic) => isCurrentDiagnostic(diagnostic, value))
